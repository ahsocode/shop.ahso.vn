
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "../../../lib/prisma";

function getTokenFromReq(req: Request): string | null {
  const auth = req.headers.get("authorization") || "";
  const bearer = auth.match(/^Bearer\s+(.+)$/i);
  if (bearer) return bearer[1];

  const cookieHeader = req.headers.get("cookie") || "";
  const cookieMatch = cookieHeader.match(/(?:^|;\s*)auth_token=([^;]+)/);
  return cookieMatch ? decodeURIComponent(cookieMatch[1]) : null;
}

async function getUserIdFromReq(req: Request) {
  const token = getTokenFromReq(req);
  if (!token) return null;
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Missing JWT_SECRET");
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    return (payload.sub as string) ?? null;
  } catch {
    return null;
  }
}

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
        shippingAddress: {
          select: { id: true, line1: true, line2: true, city: true, state: true, postalCode: true, country: true }
        },
        billingAddress: {
          select: { id: true, line1: true, line2: true, city: true, state: true, postalCode: true, country: true }
        }
      }
    });

    if (!user) return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });
    return NextResponse.json({ profile: user });
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

   
    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        shippingAddressId: true,
        billingAddressId: true,
        shippingAddress: true,
        billingAddress: true
      }
    });
    if (!me) return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });

    
    const userUpdate: any = {};
    if (data.fullName !== undefined) userUpdate.fullName = data.fullName;
    if (data.taxCode !== undefined) userUpdate.taxCode = data.taxCode ?? null;
    if (data.phone !== undefined) userUpdate.phoneE164 = toE164VN(data.phone);
    if (data.avatarUrl !== undefined) {
  userUpdate.avatarUrl = data.avatarUrl || "/logo.png";
}


    
    let shippingAddrId = me.shippingAddressId;
    if (data.shippingAddress) {
      const s = { ...data.shippingAddress, country: normCountry2(data.shippingAddress.country) };
      if (me.shippingAddress) {
        
        await prisma.address.update({
          where: { id: me.shippingAddressId },
          data: {
            line1: s.line1, line2: s.line2 ?? null, city: s.city, state: s.state ?? null,
            postalCode: s.postalCode ?? null, country: s.country
          }
        });
      } else {
       
        const created = await prisma.address.create({
          data: {
            line1: s.line1, line2: s.line2 ?? null, city: s.city, state: s.state ?? null,
            postalCode: s.postalCode ?? null, country: s.country
          }
        });
        shippingAddrId = created.id;
        userUpdate.shippingAddressId = created.id;
      }
    }

    let billingAddrId = me.billingAddressId ?? me.shippingAddressId;
    if (data.billingAddress === null) {
      billingAddrId = shippingAddrId;
      userUpdate.billingAddressId = shippingAddrId;
    } else if (data.billingAddress) {
      const s = data.shippingAddress
        ? { ...data.shippingAddress, country: normCountry2(data.shippingAddress.country) }
        : me.shippingAddress!
          ? {
              line1: me.shippingAddress.line1,
              line2: me.shippingAddress.line2 ?? undefined,
              city: me.shippingAddress.city,
              state: me.shippingAddress.state ?? undefined,
              postalCode: me.shippingAddress.postalCode ?? undefined,
              country: me.shippingAddress.country
            }
          : null;

      const b = { ...data.billingAddress, country: normCountry2(data.billingAddress.country) };

      if (s && addressesEqual(s, b)) {
        billingAddrId = shippingAddrId;
        userUpdate.billingAddressId = shippingAddrId;
      } else {
        if (me.billingAddressId && me.billingAddress) {
          await prisma.address.update({
            where: { id: me.billingAddressId },
            data: {
              line1: b.line1, line2: b.line2 ?? null, city: b.city, state: b.state ?? null,
              postalCode: b.postalCode ?? null, country: b.country
            }
          });
          billingAddrId = me.billingAddressId;
        } else {
          const created = await prisma.address.create({
            data: {
              line1: b.line1, line2: b.line2 ?? null, city: b.city, state: b.state ?? null,
              postalCode: b.postalCode ?? null, country: b.country
            }
          });
          billingAddrId = created.id;
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
        shippingAddress: {
          select: { id: true, line1: true, line2: true, city: true, state: true, postalCode: true, country: true }
        },
        billingAddress: {
          select: { id: true, line1: true, line2: true, city: true, state: true, postalCode: true, country: true }
        }
      }
    });

    return NextResponse.json({ profile: updated });
  } catch (e) {
    console.error("PROFILE PATCH ERROR:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
