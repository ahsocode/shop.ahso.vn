"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react"
import Image from "next/image"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Email không hợp lệ")
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email.toLowerCase() }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.error === "USER_NOT_FOUND") {
          setError("Email không tồn tại trong hệ thống")
        } else {
          setError(data.message || "Đã có lỗi xảy ra. Vui lòng thử lại!")
        }
        return
      }

      setSuccess(true)
    } catch (err) {
      console.error("Forgot password error:", err)
      setError("Không thể kết nối đến máy chủ. Vui lòng thử lại!")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Image
              src="/logo.png"
              alt="AHSO Logo"
              width={48}
              height={48}
              className="h-12 w-12 object-contain"
              priority
            />
            <span>AHSO</span>
          </Link>
        </div>

        <Card className="shadow-xl border-t-4 border-t-blue-600">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Quên mật khẩu</CardTitle>
            <CardDescription className="text-center">
              {success 
                ? "Kiểm tra email của bạn để đặt lại mật khẩu"
                : "Nhập email để nhận link đặt lại mật khẩu"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="space-y-6">
                {/* Success State */}
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Email đã được gửi!
                  </h3>
                  <p className="text-sm text-gray-600 mb-6">
                    Chúng tôi đã gửi hướng dẫn đặt lại mật khẩu đến email:
                    <br />
                    <strong className="text-gray-900">{email}</strong>
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-gray-700">
                    <p className="font-medium mb-2">Lưu ý:</p>
                    <ul className="space-y-1 text-left">
                      <li>• Kiểm tra cả hộp thư spam/junk</li>
                      <li>• Link có hiệu lực trong 15 phút</li>
                      <li>• Nếu không nhận được email, hãy thử lại</li>
                    </ul>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button 
                    onClick={() => setSuccess(false)} 
                    variant="outline" 
                    className="w-full"
                  >
                    Gửi lại email
                  </Button>
                  <Link href="/login">
                    <Button className="w-full">
                      Quay lại đăng nhập
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <>
                {/* Error Message */}
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value)
                          if (error) setError("")
                        }}
                        placeholder="Nhập email của bạn"
                        className="pl-10"
                        required
                        autoComplete="email"
                        disabled={isLoading}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Nhập email bạn đã đăng ký tài khoản
                    </p>
                  </div>

                  <Button type="submit" className="w-full h-11" disabled={isLoading}>
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Đang gửi...
                      </span>
                    ) : (
                      "Gửi link đặt lại mật khẩu"
                    )}
                  </Button>
                </form>

                <div className="mt-6">
                  <Link href="/login">
                    <Button variant="outline" className="w-full">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Quay lại đăng nhập
                    </Button>
                  </Link>
                </div>

                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-600">
                    Chưa có tài khoản?{" "}
                    <Link href="/register" className="text-blue-600 hover:text-blue-700 font-medium">
                      Đăng ký ngay
                    </Link>
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {!success && (
          <div className="mt-6 text-center">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                Quay lại trang chủ
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}