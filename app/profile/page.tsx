"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  User, Mail, Phone, MapPin, Edit, Package, Heart, ShoppingBag, Loader2
} from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";

type Address = {
  id: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postalCode: string | null;
  country: string;
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

function formatPhoneHuman(e164?: string | null) {
  if (!e164) return "—";
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

export default function ProfilePage() {
  const router = useRouter();
  const { user: authUser, loading: authLoading, logout, verified } = useAuth(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(
    () => [
      { label: "Đơn hàng", value: "—", icon: Package },
      { label: "Yêu thích", value: "—", icon: Heart },
      { label: "Giỏ hàng", value: "—", icon: ShoppingBag },
    ],
    []
  );

  useEffect(() => {
    // ✅ Chỉ load profile khi auth đã verify xong VÀ có user
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
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error("Failed to load profile");
        }

        const data = await res.json();
        
        if ("profile" in data && isMounted) {
          setProfile(data.profile);
        }
      } catch (e: any) {
        if (isMounted) {
          console.error("Profile load error:", e);
          setError(e?.message || "ERROR");
        }
      } finally {
        if (isMounted) {
          setProfileLoading(false);
        }
      }
    }

    loadProfile();
    return () => { isMounted = false; };
  }, [authUser, authLoading, verified]);

  // ✅ Show loading while auth is verifying
  if (authLoading || !verified) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Đang kiểm tra đăng nhập...</p>
        </div>
      </div>
    );
  }

  // Auth required but no user (should not reach here due to useAuth redirect)
  if (!authUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Vui lòng đăng nhập</p>
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
      {/* Header */}
      <div className="bg-linear-to-r from-blue-600 to-blue-800 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Avatar */}
            <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border-4 border-white/30 overflow-hidden">
              {profileLoading ? (
                <Loader2 className="h-10 w-10 animate-spin" />
              ) : (authUser.avatarUrl && authUser.avatarUrl !== "/logo.png") ? (
                <img
                  src={authUser.avatarUrl}
                  alt="avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl font-bold">
                  {displayName?.charAt(0)?.toUpperCase()}
                </span>
              )}
            </div>

            <div className="text-center md:text-left flex-1">
              <h1 className="text-3xl font-bold mb-2">
                {profileLoading ? "Đang tải..." : displayName}
              </h1>

              <p className="text-blue-100 mb-4">
                {authUser.email}
              </p>

              <Link href="/profile/edit">
                <Button variant="outline" className="border-black text-blue-600 hover:bg-white/10 hover:text-white hover:stroke-zinc-500">
                  <Edit className="h-4 w-4 mr-2" />
                  Chỉnh sửa hồ sơ
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Error bar */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-red-800">
            Không tải được hồ sơ: {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 -mt-8 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="shadow-lg">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {stat.value}
                    </p>
                    <p className="text-sm text-gray-600">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Information */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Thông tin cá nhân</CardTitle>
                <CardDescription>Thông tin chi tiết về tài khoản của bạn</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Họ và tên</p>
                    <p className="font-medium">
                      {profileLoading ? "—" : displayName}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">
                      {profileLoading ? "—" : profile?.email ?? authUser.email ?? "—"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Số điện thoại</p>
                    <p className="font-medium">
                      {profileLoading ? "—" : formatPhoneHuman(profile?.phoneE164)}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Địa chỉ giao hàng</p>
                    <p className="font-medium text-sm">
                      {profileLoading ? "—" : addressToLine(profile?.shippingAddress)}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Địa chỉ nhận hóa đơn</p>
                    <p className="font-medium text-sm">
                      {profileLoading ? "—" : addressToLine(profile?.billingAddress)}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button 
                    variant="outline" 
                    className="w-full border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={logout}
                  >
                    Đăng xuất
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Orders */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Đơn hàng gần đây</CardTitle>
                <CardDescription>Theo dõi trạng thái đơn hàng của bạn</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-8 text-sm text-gray-500">
                  (Chưa kết nối endpoint đơn hàng — thêm sau)
                </div>

                <Link href="/profile/orders">
                  <Button variant="outline" className="w-full mt-2">
                    Xem tất cả đơn hàng
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>Hành động nhanh</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <Link href="/wishlist">
                    <Button variant="outline" className="h-20 w-full flex-col">
                      <Heart className="h-6 w-6 mb-2" />
                      Danh sách yêu thích
                    </Button>
                  </Link>

                  <Link href="/cart">
                    <Button variant="outline" className="h-20 w-full flex-col">
                      <ShoppingBag className="h-6 w-6 mb-2" />
                      Giỏ hàng
                    </Button>
                  </Link>

                  <Link href="/shop" className="col-span-2">
                    <Button className="w-full h-12">
                      Tiếp tục mua sắm
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}