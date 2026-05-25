
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import type { userUncheckedUpdateInput } from "@/lib/prisma-types";
import { getUserIdFromReq } from "@/lib/auth-request";

export async function GET(req: Request) {
  try {
    const userId = await getUserIdFromReq(req);
    if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        phoneE164: true,
        taxCode: true,
        emailVerified: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
        address_user_shippingAddressIdToaddress: {
          select: { id: true, line1: true, line2: true, city: true, state: true, postalCode: true, country: true }
        },
        address_user_billingAddressIdToaddress: {
          select: { id: true, line1: true, line2: true, city: true, state: true, postalCode: true, country: true }
        }
      }
    });

    if (!user) return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });
    const {
      address_user_shippingAddressIdToaddress,
      address_user_billingAddressIdToaddress,
      ...rest
    } = user;
    return NextResponse.json({
      profile: {
        ...rest,
        shippingAddress: address_user_shippingAddressIdToaddress,
        billingAddress: address_user_billingAddressIdToaddress,
      },
    });
  } catch (e) {
    console.error("PROFILE GET ERROR:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}



import { z } from "zod";

const addressSchema = z.object({
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().length(2)
});

const patchSchema = z.object({
  fullName: z.string().min(1).max(128).optional(),
  phone: z.string().min(9).max(20).optional(),
  taxCode: z.string().regex(/^\d{10}(\d{3})?$/).optional().nullable(),
  shippingAddress: addressSchema.optional(),
  billingAddress: addressSchema.optional().nullable(),
  avatarUrl: z.string().url().or(z.string().startsWith("/")).optional() // <— NEW
});


const PHONE_VN_REGEX = /^(?:\+?84|0)(\d{9})$/;
function toE164VN(input: string): string {
  const s = input.replace(/\s|-/g, "");
  const m = s.match(PHONE_VN_REGEX);
  if (!m) return s.startsWith("+") ? s : s;
  return `+84${m[1]}`;
}
const normCountry2 = (s: string) => s.toUpperCase();
function addressesEqual(a: z.infer<typeof addressSchema>, b: z.infer<typeof addressSchema>) {
  return (
    a.line1 === b.line1 &&
    (a.line2 ?? "") === (b.line2 ?? "") &&
    a.city === b.city &&
    (a.state ?? "") === (b.state ?? "") &&
    (a.postalCode ?? "") === (b.postalCode ?? "") &&
    normCountry2(a.country) === normCountry2(b.country)
  );
}

export async function PATCH(req: Request) {
  try {
    const userId = await getUserIdFromReq(req);
    if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const now = new Date();

   
    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        shippingAddressId: true,
        billingAddressId: true,
        address_user_shippingAddressIdToaddress: true,
        address_user_billingAddressIdToaddress: true,
      }
    });
    if (!me) return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });

    
    const userUpdate: userUncheckedUpdateInput = {};
    if (data.fullName !== undefined) userUpdate.fullName = data.fullName;
    if (data.taxCode !== undefined) userUpdate.taxCode = data.taxCode ?? null;
    if (data.phone !== undefined) userUpdate.phoneE164 = toE164VN(data.phone);
    if (data.avatarUrl !== undefined) {
  userUpdate.avatarUrl = data.avatarUrl || "/logo.png";
}


    
    let shippingAddrId = me.shippingAddressId;
    if (data.shippingAddress) {
      const s = { ...data.shippingAddress, country: normCountry2(data.shippingAddress.country) };
      if (me.address_user_shippingAddressIdToaddress) {
        
        await prisma.address.update({
          where: { id: me.shippingAddressId },
          data: {
            line1: s.line1, line2: s.line2 ?? null, city: s.city, state: s.state ?? null,
            postalCode: s.postalCode ?? null, country: s.country,
            updatedAt: now,
          }
        });
      } else {
       
        const created = await prisma.address.create({
          data: {
            id: randomUUID(),
            line1: s.line1, line2: s.line2 ?? null, city: s.city, state: s.state ?? null,
            postalCode: s.postalCode ?? null, country: s.country,
            updatedAt: now,
          }
        });
        shippingAddrId = created.id;
        userUpdate.shippingAddressId = created.id;
      }
    }

    if (data.billingAddress === null) {
      userUpdate.billingAddressId = shippingAddrId ?? me.billingAddressId ?? null;
    } else if (data.billingAddress) {
      const s = data.shippingAddress
        ? { ...data.shippingAddress, country: normCountry2(data.shippingAddress.country) }
        : me.address_user_shippingAddressIdToaddress!
          ? {
              line1: me.address_user_shippingAddressIdToaddress.line1,
              line2: me.address_user_shippingAddressIdToaddress.line2 ?? undefined,
              city: me.address_user_shippingAddressIdToaddress.city,
              state: me.address_user_shippingAddressIdToaddress.state ?? undefined,
              postalCode: me.address_user_shippingAddressIdToaddress.postalCode ?? undefined,
              country: me.address_user_shippingAddressIdToaddress.country
            }
          : null;

      const b = { ...data.billingAddress, country: normCountry2(data.billingAddress.country) };

      if (s && addressesEqual(s, b)) {
        userUpdate.billingAddressId = shippingAddrId ?? me.billingAddressId ?? null;
      } else {
        if (me.billingAddressId && me.address_user_billingAddressIdToaddress) {
          await prisma.address.update({
            where: { id: me.billingAddressId },
            data: {
              line1: b.line1, line2: b.line2 ?? null, city: b.city, state: b.state ?? null,
              postalCode: b.postalCode ?? null, country: b.country,
              updatedAt: now,
            }
          });
          userUpdate.billingAddressId = me.billingAddressId;
        } else {
          const created = await prisma.address.create({
            data: {
              id: randomUUID(),
              line1: b.line1, line2: b.line2 ?? null, city: b.city, state: b.state ?? null,
              postalCode: b.postalCode ?? null, country: b.country,
              updatedAt: now,
            }
          });
          userUpdate.billingAddressId = created.id;
        }
      }
    }

    const updated = await prisma.user.update({
      where: { id: me.id },
      data: userUpdate,
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        phoneE164: true,
        taxCode: true,
        emailVerified: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
        address_user_shippingAddressIdToaddress: {
          select: { id: true, line1: true, line2: true, city: true, state: true, postalCode: true, country: true }
        },
        address_user_billingAddressIdToaddress: {
          select: { id: true, line1: true, line2: true, city: true, state: true, postalCode: true, country: true }
        }
      }
    });

    const {
      address_user_shippingAddressIdToaddress: shippingAddress,
      address_user_billingAddressIdToaddress: billingAddress,
      ...restUpdated
    } = updated;

    return NextResponse.json({
      profile: { ...restUpdated, shippingAddress, billingAddress },
    });
  } catch (e) {
    console.error("PROFILE PATCH ERROR:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
