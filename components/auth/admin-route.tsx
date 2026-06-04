"use client"

import { useAuth } from "@/lib/hooks/useAuth"
import { Loader2 } from "lucide-react"
import NotFoundPage from "@/components/not-found/NotFoundPage"

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth(true)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Đang kiểm tra quyền truy cập...</p>
        </div>
      </div>
    )
  }

  if (!user || user.role !== "ADMIN") {
    return (
      <NotFoundPage
        title="Không tìm thấy trang"
        description="Trang bạn truy cập không tồn tại hoặc đã được chuyển sang nơi khác."
        primaryHref="/"
        primaryLabel="Về trang chủ"
        secondaryHref="/contact"
        secondaryLabel="Liên hệ AHSO"
      />
    )
  }

  return <>{children}</>
}
