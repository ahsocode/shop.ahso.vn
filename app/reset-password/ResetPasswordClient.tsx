// app/reset-password/ResetPasswordClient.tsx
"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Lock, CheckCircle, AlertCircle, Eye, EyeOff } from "lucide-react"
import Image from "next/image"

export default function ResetPasswordClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  })

  useEffect(() => {
    if (!token) {
      setError("Link đặt lại mật khẩu không hợp lệ")
    }
  }, [token])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
    if (error) setError("")
  }

  const validateForm = () => {
    if (!formData.password || formData.password.length < 8) {
      setError("Mật khẩu phải có ít nhất 8 ký tự")
      return false
    }
    if (!/[a-z]/.test(formData.password) || !/[A-Z]/.test(formData.password) || !/\d/.test(formData.password)) {
      setError("Mật khẩu cần có chữ hoa, chữ thường và số")
      return false
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Mật khẩu xác nhận không khớp")
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!token) {
      setError("Link đặt lại mật khẩu không hợp lệ")
      return
    }

    if (!validateForm()) return

    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: formData.password }),
      })

      const data = await response.json()

      if (!response.ok) {
        const msg =
          data.error === "INVALID_TOKEN"
            ? "Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn"
            : data.error === "USER_NOT_FOUND"
            ? "Người dùng không tồn tại"
            : data.error === "VALIDATION_ERROR"
            ? "Vui lòng kiểm tra lại mật khẩu"
            : data.message || "Đã có lỗi xảy ra. Vui lòng thử lại!"
        setError(msg)
        return
      }

      setSuccess(true)
      setTimeout(() => router.push("/login"), 3000)
    } catch (err) {
      console.error("Reset password error:", err)
      setError("Không thể kết nối đến máy chủ. Vui lòng thử lại!")
    } finally {
      setIsLoading(false)
    }
  }

  // ─── UI khi không có token ─────────────────────
  if (!token) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 text-2xl font-bold text-gray-900">
              <Image src="/logo.png" alt="AHSO Logo" width={48} height={48} className="h-12 w-12 object-contain" priority />
              <span>AHSO</span>
            </Link>
          </div>

          <Card className="shadow-xl border-t-4 border-t-red-600">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="h-8 w-8 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Link không hợp lệ</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.
                </p>
                <Link href="/forgot-password">
                  <Button className="w-full">Yêu cầu link mới</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // ─── UI chính ───────────────────────────────────
  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Image src="/logo.png" alt="AHSO Logo" width={48} height={48} className="h-12 w-12 object-contain" priority />
            <span>AHSO</span>
          </Link>
        </div>

        <Card className="shadow-xl border-t-4 border-t-blue-600">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              {success ? "Đặt lại mật khẩu thành công" : "Đặt lại mật khẩu"}
            </CardTitle>
            <CardDescription className="text-center">
              {success ? "Mật khẩu của bạn đã được cập nhật" : "Nhập mật khẩu mới cho tài khoản của bạn"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {success ? (
              <div className="space-y-6">
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Hoàn tất!</h3>
                  <p className="text-sm text-gray-600 mb-6">
                    Mật khẩu của bạn đã được đặt lại thành công.
                    <br />
                    Bạn có thể đăng nhập với mật khẩu mới.
                  </p>
                  <p className="text-xs text-gray-500">Đang chuyển hướng đến trang đăng nhập...</p>
                </div>
                <Link href="/login">
                  <Button className="w-full">Đăng nhập ngay</Button>
                </Link>
              </div>
            ) : (
              <>
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Mật khẩu mới */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Mật khẩu mới <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Nhập mật khẩu mới"
                        className="pl-10 pr-10"
                        required
                        autoComplete="new-password"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Tối thiểu 8 ký tự, có chữ hoa, thường và số</p>
                  </div>

                  {/* Xác nhận mật khẩu */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Xác nhận mật khẩu mới <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="Nhập lại mật khẩu mới"
                        className="pl-10 pr-10"
                        required
                        autoComplete="new-password"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full h-11" disabled={isLoading}>
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Đang xử lý...
                      </span>
                    ) : (
                      "Đặt lại mật khẩu"
                    )}
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <Link href="/login" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    Quay lại đăng nhập
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}