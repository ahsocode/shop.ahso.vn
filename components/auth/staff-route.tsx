"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";

type Props = {
  children: React.ReactNode;
};

function hasStaffPermission(role?: string | null) {
  return role === "STAFF" || role === "ADMIN";
}

export function StaffRoute({ children }: Props) {
  const { user, loading } = useAuth(true);
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && !hasStaffPermission(user.role)) {
      router.push("/");
    }
  }, [loading, router, user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <Loader2 className="h-9 w-9 animate-spin text-blue-600 mx-auto" />
          <p className="text-sm text-slate-500">Đang kiểm tra quyền truy cập…</p>
        </div>
      </div>
    );
  }

  if (!user || !hasStaffPermission(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-sm text-center space-y-3">
          <div className="mx-auto h-14 w-14 rounded-full bg-slate-200 flex items-center justify-center">
            <ShieldAlert className="h-7 w-7 text-slate-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Truy cập bị từ chối</h2>
            <p className="text-sm text-slate-600">
              Khu vực này chỉ dành cho nhân viên vận hành. Vui lòng sử dụng tài khoản Staff hợp lệ.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
