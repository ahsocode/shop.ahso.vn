"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, User, Mail, Phone, MapPin } from "lucide-react";
import { setUser} from "@/lib/auth-store";

type Address = {
  line1: string;
  line2?: string | null;
  city: string;
  state?: string | null;
  postalCode?: string | null;
  country: string; // ISO-2
};

type Profile = {
  id: string;
  username: string | null;
  fullName: string | null;
  email: string;
  phoneE164: string | null;
  taxCode: string | null;
  emailVerified: boolean;
  role: string;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
  shippingAddress: Address | null;
  billingAddress: Address | null;
};

type ApiResponse =
  | { profile: Profile }
  | { error: string; details?: unknown };

const addressSchema = z.object({
  line1: z.string().min(1, "Bắt buộc"),
  line2: z.string().optional().or(z.literal("").transform(() => undefined)),
  city: z.string().min(1, "Bắt buộc"),
  state: z.string().optional().or(z.literal("").transform(() => undefined)),
  postalCode: z.string().optional().or(z.literal("").transform(() => undefined)),
  country: z.string().length(2, "Dùng mã quốc gia 2 ký tự (VD: VN, US)").toUpperCase(),
});

const formSchema = z.object({
  fullName: z.string().min(1, "Bắt buộc").max(128),
  email: z.string().email(), 
  phone: z.string().min(9, "Số đt không hợp lệ").max(20),
  taxCode: z
    .string()
    .regex(/^\d{10}(\d{3})?$/, "MST 10 hoặc 13 chữ số")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  avatarUrl: z.string().url().optional().or(z.literal("").transform(() => undefined)),
  shippingAddress: addressSchema,
  billingAddress: addressSchema,
});

type FormValues = z.infer<typeof formSchema>;

/** Cloudinary Upload Widget */
declare global {
  interface Window {
    cloudinary?: any;
  }
}
function useCloudinaryWidget(onUploaded: (url: string) => void) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;
  const widgetRef = useRef<any>(null);

  useEffect(() => {
    const ensureWidget = () => {
      widgetRef.current = window.cloudinary?.createUploadWidget(
        {
          cloudName,
          uploadPreset,         // UNSIGNED preset name (vd: "shop.ahso.vn")
          multiple: false,
          sources: ["local", "url", "camera"],
          folder: "avatars",
          clientAllowedFormats: ["jpg", "jpeg", "png", "webp"],
          maxFileSize: 5_000_000,
        },
        (error: any, result: any) => {
          if (!error && result?.event === "success") {
            const url = result?.info?.secure_url as string;
            if (url) onUploaded(url);
          }
        }
      );
    };

    // nạp script widget nếu chưa có
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://widget.cloudinary.com/v2.0/global/all.js"]'
    );
    if (!existing) {
      const s = document.createElement("script");
      s.src = "https://widget.cloudinary.com/v2.0/global/all.js";
      s.async = true;
      s.onload = ensureWidget;
      document.body.appendChild(s);
    } else {
      ensureWidget();
    }
  }, [onUploaded, cloudName, uploadPreset]);

  const open = () => widgetRef.current?.open?.();
  return { open };
}

function formatPhoneHuman(e164?: string | null) {
  if (!e164) return "";
  const m = e164.match(/^\+?(\d{2})(\d{2})(\d{3})(\d{4})$/);
  if (m) return `+${m[1]} ${m[2]} ${m[3]} ${m[4]}`;
  return e164;
}
function addressToLine(a?: Address | null) {
  if (!a) return "—";
  const parts = [
    a.line1,
    a.line2 || undefined,
    a.city,
    a.state || undefined,
    a.postalCode || undefined,
    a.country,
  ].filter(Boolean);
  return parts.join(", ");
}

function ProfilePreview({
  fullName,
  email,
  phone,
  avatarUrl,
  shippingAddress,
  billingAddress,
}: {
  fullName: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  shippingAddress?: Address;
  billingAddress?: Address;
}) {
  const displayName = fullName || "Người dùng";
  const avatar = avatarUrl || "/logo.png";
  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle>Xem trước hồ sơ</CardTitle>
        <CardDescription>Giao diện người dùng sẽ thấy sau khi lưu</CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="bg-linear-to-r from-blue-600 to-blue-800 rounded-xl text-white p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white/30 bg-white/20 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="text-xl font-bold">{displayName}</div>
              <div className="text-blue-100 text-sm">{email}</div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <User className="h-5 w-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm text-gray-500">Họ và tên</p>
              <p className="font-medium text-gray-900">{displayName}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium text-gray-900">{email}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm text-gray-500">Số điện thoại</p>
              <p className="font-medium text-gray-900">{formatPhoneHuman(phone)}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm text-gray-500">Địa chỉ giao hàng</p>
              <p className="font-medium text-gray-900">{addressToLine(shippingAddress)}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm text-gray-500">Địa chỉ nhận hóa đơn</p>
              <p className="font-medium text-gray-900">{addressToLine(billingAddress)}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function EditProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      taxCode: "",
      avatarUrl: "",
      shippingAddress: {
        line1: "",
        line2: "",
        city: "",
        state: "",
        postalCode: "",
        country: "",
      },
      billingAddress: {
        line1: "",
        line2: "",
        city: "",
        state: "",
        postalCode: "",
        country: "",
      },
    },
    mode: "onChange",
  });

  const watch = form.watch();
  const { open: openUpload } = useCloudinaryWidget((url) => {
    form.setValue("avatarUrl", url, { shouldDirty: true, shouldValidate: true });
  });

  // Load profile ban đầu
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        const res = await fetch("/api/profile", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          cache: "no-store",
        });
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        if (!res.ok) {
          const t: ApiResponse = await res.json();
          throw new Error((t as any)?.error || "REQUEST_FAILED");
        }
        const data: ApiResponse = await res.json();
        if ("profile" in data) {
          const p = data.profile;
          if (!mounted) return;
          form.reset({
            fullName: p.fullName || "",
            email: p.email,
            phone: p.phoneE164 || "",
            taxCode: p.taxCode || "",
            avatarUrl: p.avatarUrl || "",
            shippingAddress: {
              line1: p.shippingAddress?.line1 || "",
              line2: p.shippingAddress?.line2 || "",
              city: p.shippingAddress?.city || "",
              state: p.shippingAddress?.state || "",
              postalCode: p.shippingAddress?.postalCode || "",
              country: p.shippingAddress?.country || "VN",
            },
            billingAddress: {
              line1: p.billingAddress?.line1 || "",
              line2: p.billingAddress?.line2 || "",
              city: p.billingAddress?.city || "",
              state: p.billingAddress?.state || "",
              postalCode: p.billingAddress?.postalCode || "",
              country: p.billingAddress?.country || "VN",
            },
          });
        } else {
          throw new Error((data as any).error || "UNKNOWN_ERROR");
        }
      } catch (e: any) {
        setError(e?.message || "ERROR");
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [form, router]);

  // Submit PATCH
  const onSubmit = async (values: FormValues) => {
    setSaving(true);
    setError(null);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

      const payload = {
        fullName: values.fullName,
        phone: values.phone, // server sẽ normalize sang E.164
        taxCode: values.taxCode,
        avatarUrl: values.avatarUrl,
        shippingAddress: values.shippingAddress,
        billingAddress: values.billingAddress,
      };

      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const t = await res.json();
        throw new Error(t?.error || "PATCH_FAILED");
      }

      // Lấy dữ liệu mới để cập nhật navbar (không cần logout)
      const meRes = await fetch("/api/auth/me", {
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        cache: "no-store",
      });
      if (meRes.ok) {
        const { user } = await meRes.json();
       setUser({
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          avatarUrl: user.avatarUrl,
          role: user.role,
        });
      }

      router.push("/profile");
    } catch (e: any) {
      setError(e?.message || "ERROR");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/profile">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay lại hồ sơ
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Chỉnh sửa hồ sơ</h1>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          Đang tải dữ liệu...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form */}
          <Card>
            <CardHeader>
              <CardTitle>Thông tin</CardTitle>
              <CardDescription>Cập nhật ảnh đại diện, thông tin liên hệ và địa chỉ</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar */}
              <div className="space-y-2">
                <Label>Ảnh đại diện</Label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={watch.avatarUrl || "/logo.png"}
                      alt="avatar"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" onClick={openUpload}>
                      Tải ảnh 
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => form.setValue("avatarUrl", "", { shouldDirty: true })}
                    >
                      Xoá ảnh
                    </Button>
                  </div>
                </div>
                <Input
                  placeholder="https://res.cloudinary.com/<cloud_name>/image/upload/..."
                  value={watch.avatarUrl || ""}
                  onChange={(e) => form.setValue("avatarUrl", e.target.value, { shouldDirty: true })}
                />
              </div>

              {/* Basic info */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Họ và tên</Label>
                  <Input id="fullName" {...form.register("fullName")} />
                  {form.formState.errors.fullName && (
                    <p className="text-sm text-red-600">{form.formState.errors.fullName.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" {...form.register("email")} readOnly className="bg-gray-50" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Số điện thoại</Label>
                  <Input id="phone" placeholder="+84..." {...form.register("phone")} />
                  {form.formState.errors.phone && (
                    <p className="text-sm text-red-600">{form.formState.errors.phone.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxCode">Mã số thuế (tuỳ chọn)</Label>
                  <Input id="taxCode" placeholder="VD: 0312345678" {...form.register("taxCode")} />
                  {form.formState.errors.taxCode && (
                    <p className="text-sm text-red-600">{form.formState.errors.taxCode.message as string}</p>
                  )}
                </div>
              </div>

              {/* Shipping Address */}
              <div className="space-y-3">
                <div className="font-medium">Địa chỉ giao hàng</div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Địa chỉ (dòng 1)</Label>
                    <Input {...form.register("shippingAddress.line1")} />
                    {form.formState.errors.shippingAddress?.line1 && (
                      <p className="text-sm text-red-600">{form.formState.errors.shippingAddress.line1.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Địa chỉ (dòng 2)</Label>
                    <Input {...form.register("shippingAddress.line2")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Thành phố</Label>
                    <Input {...form.register("shippingAddress.city")} />
                    {form.formState.errors.shippingAddress?.city && (
                      <p className="text-sm text-red-600">{form.formState.errors.shippingAddress.city.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Tỉnh/Bang</Label>
                    <Input {...form.register("shippingAddress.state")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Mã bưu điện</Label>
                    <Input {...form.register("shippingAddress.postalCode")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Quốc gia (ISO-2)</Label>
                    <Input placeholder="VN" {...form.register("shippingAddress.country")} />
                    {form.formState.errors.shippingAddress?.country && (
                      <p className="text-sm text-red-600">{form.formState.errors.shippingAddress.country.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Billing Address */}
              <div className="space-y-3">
                <div className="font-medium">Địa chỉ nhận hóa đơn</div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Địa chỉ (dòng 1)</Label>
                    <Input {...form.register("billingAddress.line1")} />
                    {form.formState.errors.billingAddress?.line1 && (
                      <p className="text-sm text-red-600">{form.formState.errors.billingAddress.line1.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Địa chỉ (dòng 2)</Label>
                    <Input {...form.register("billingAddress.line2")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Thành phố</Label>
                    <Input {...form.register("billingAddress.city")} />
                    {form.formState.errors.billingAddress?.city && (
                      <p className="text-sm text-red-600">{form.formState.errors.billingAddress.city.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Tỉnh/Bang</Label>
                    <Input {...form.register("billingAddress.state")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Mã bưu điện</Label>
                    <Input {...form.register("billingAddress.postalCode")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Quốc gia (ISO-2)</Label>
                    <Input placeholder="VN" {...form.register("billingAddress.country")} />
                    {form.formState.errors.billingAddress?.country && (
                      <p className="text-sm text-red-600">{form.formState.errors.billingAddress.country.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <Button disabled={saving} onClick={form.handleSubmit(onSubmit)}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Lưu thay đổi
                </Button>
                <Link href="/profile">
                  <Button variant="outline">Huỷ</Button>
                </Link>
              </div>

              {error && (
                <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
                  Lỗi: {error}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Preview */}
          <ProfilePreview
            fullName={watch.fullName}
            email={watch.email}
            phone={watch.phone}
            avatarUrl={watch.avatarUrl}
            shippingAddress={watch.shippingAddress}
            billingAddress={watch.billingAddress}
          />
        </div>
      )}
    </div>
  );
}
