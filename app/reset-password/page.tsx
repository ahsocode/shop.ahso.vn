// app/reset-password/page.tsx
import { Suspense } from "react"
import ResetPasswordClient from "./ResetPasswordClient"

// Tắt prerender – trang phụ thuộc query param
export const dynamic = "force-dynamic"

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-lg">Đang tải...</p>
        </div>
      }
    >
      <ResetPasswordClient />
    </Suspense>
  )
}