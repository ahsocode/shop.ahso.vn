"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Edit, Loader2, Mail, MapPin, Phone, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/hooks/useAuth";

type Address = {
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postalCode: string | null;
  country: string;
};

type Profile = {
  username: string | null;
  fullName: string | null;
  email: string;
  phoneE164: string | null;
  avatarUrl: string | null;
  shippingAddress: Address | null;
  billingAddress: Address | null;
};

function formatPhoneHuman(e164?: string | null) {
  if (!e164) return "-";
  const m = e164.match(/^\+?(\d{2})(\d{2})(\d{3})(\d{4})$/);
  if (m) return `+${m[1]} ${m[2]} ${m[3]} ${m[4]}`;
  return e164;
}

function addressToLine(address?: Address | null) {
  if (!address) return "-";
  return [address.line1, address.line2, address.city, address.state, address.postalCode, address.country]
    .filter(Boolean)
    .join(", ");
}

export default function ProfilePage() {
  const { user: authUser, loading: authLoading, logout, verified } = useAuth(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!verified || authLoading) return;
    if (!authUser) {
      setProfileLoading(false);
      return;
    }

    let isMounted = true;

    async function loadProfile() {
      setProfileLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem("token");
        const res = await fetch("/api/profile", {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          cache: "no-store",
        });

        if (!res.ok) throw new Error("Failed to load profile");
        const data = await res.json();
        if (isMounted && "profile" in data) setProfile(data.profile);
      } catch (loadError) {
        console.error("Profile load error:", loadError);
        if (isMounted) setError("Không tải được hồ sơ.");
      } finally {
        if (isMounted) setProfileLoading(false);
      }
    }

    void loadProfile();
    return () => {
      isMounted = false;
    };
  }, [authLoading, authUser, verified]);

  if (authLoading || !verified) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-blue-600" />
          <p className="text-gray-600">Đang kiểm tra đăng nhập...</p>
        </div>
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-gray-600">Vui lòng đăng nhập</p>
          <Link href="/login">
            <Button>Đăng nhập</Button>
          </Link>
        </div>
      </div>
    );
  }

  const displayName = profile?.fullName || profile?.username || authUser.fullName || "Người dùng";

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-blue-50 text-2xl font-bold text-blue-700">
              {profileLoading ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : authUser.avatarUrl && authUser.avatarUrl !== "/logo.png" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={authUser.avatarUrl} alt="avatar" className="h-full w-full object-cover" />
              ) : (
                displayName.charAt(0).toUpperCase()
              )}
            </div>

            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-950">{profileLoading ? "Đang tải..." : displayName}</h1>
              <p className="mt-2 text-sm text-gray-600">{authUser.email}</p>
            </div>

            <Link href="/profile/edit">
              <Button variant="outline">
                <Edit className="h-4 w-4" />
                Chỉnh sửa hồ sơ
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle>Thông tin cá nhân</CardTitle>
            <CardDescription>Thông tin tài khoản dùng cho liên hệ và xử lý yêu cầu.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error ? <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
            <InfoRow icon={User} label="Họ và tên" value={profileLoading ? "-" : displayName} />
            <InfoRow icon={Mail} label="Email" value={profileLoading ? "-" : profile?.email ?? authUser.email ?? "-"} />
            <InfoRow icon={Phone} label="Số điện thoại" value={profileLoading ? "-" : formatPhoneHuman(profile?.phoneE164)} />
            <InfoRow icon={MapPin} label="Địa chỉ liên hệ" value={profileLoading ? "-" : addressToLine(profile?.shippingAddress)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hành động nhanh</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/contact" className="block">
              <Button className="w-full">Gửi yêu cầu liên hệ</Button>
            </Link>
            <Link href="/solutions" className="block">
              <Button className="w-full" variant="outline">Xem giải pháp</Button>
            </Link>
            <Link href="/software" className="block">
              <Button className="w-full" variant="outline">Xem phần mềm</Button>
            </Link>
            <Button
              className="w-full border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={logout}
              variant="outline"
            >
              Đăng xuất
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-5 w-5 text-gray-400" />
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="font-medium text-gray-900">{value}</p>
      </div>
    </div>
  );
}
