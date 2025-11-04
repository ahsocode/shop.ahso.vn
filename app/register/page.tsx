"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Lock, Mail, User, Phone, MapPin, Building, AlertCircle, Eye, EyeOff, CheckCircle } from "lucide-react"
import Image from "next/image"

export default function RegisterPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [step, setStep] = useState(1) // 1: Account Info, 2: Address Info
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    phone: "",
    taxCode: "",
    shippingAddress: {
      line1: "",
      line2: "",
      city: "",
      state: "",
      postalCode: "",
      country: "VN",
    },
    sameAsBilling: true,
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    
    if (name.startsWith("shipping.")) {
      const field = name.split(".")[1]
      setFormData({
        ...formData,
        shippingAddress: {
          ...formData.shippingAddress,
          [field]: value,
        },
      })
    } else if (type === "checkbox") {
      setFormData({
        ...formData,
        [name]: checked,
      })
    } else {
      setFormData({
        ...formData,
        [name]: value,
      })
    }
    if (error) setError("")
  }

  const validateStep1 = () => {
    if (!formData.username || formData.username.length < 3) {
      setError("Tên đăng nhập phải có ít nhất 3 ký tự")
      return false
    }
    if (!/^[a-z0-9_.-]+$/.test(formData.username)) {
      setError("Tên đăng nhập chỉ được chứa chữ thường, số và các ký tự _ . -")
      return false
    }
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError("Email không hợp lệ")
      return false
    }
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
    if (!formData.fullName) {
      setError("Vui lòng nhập họ và tên")
      return false
    }
    if (!formData.phone || formData.phone.length < 9) {
      setError("Số điện thoại không hợp lệ")
      return false
    }
    return true
  }

  const validateStep2 = () => {
    if (!formData.shippingAddress.line1) {
      setError("Vui lòng nhập địa chỉ")
      return false
    }
    if (!formData.shippingAddress.city) {
      setError("Vui lòng nhập thành phố")
      return false
    }
    return true
  }

  const handleNext = () => {
    setError("")
    if (step === 1 && validateStep1()) {
      setStep(2)
    }
  }

  const handleBack = () => {
    setError("")
    setStep(1)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateStep2()) return

    setIsLoading(true)
    setError("")

    try {
      const payload = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        phone: formData.phone,
        taxCode: formData.taxCode || undefined,
        shippingAddress: formData.shippingAddress,
        billingAddress: formData.sameAsBilling ? undefined : formData.shippingAddress,
      }

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.error === "CONFLICT") {
          setError("Email, tên đăng nhập hoặc số điện thoại đã được sử dụng")
        } else if (data.error === "VALIDATION_ERROR") {
          setError("Vui lòng kiểm tra lại thông tin đăng ký")
        } else {
          setError(data.message || "Đã có lỗi xảy ra. Vui lòng thử lại!")
        }
        return
      }

      // Lưu token vào localStorage
      localStorage.setItem("token", data.token)
      localStorage.setItem("user", JSON.stringify(data.user))

      // Chuyển hướng về trang chủ hoặc trang profile
      router.push("/profile")
      router.refresh()
    } catch (err) {
      console.error("Register error:", err)
      setError("Không thể kết nối đến máy chủ. Vui lòng thử lại!")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
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
            <CardTitle className="text-2xl font-bold text-center">Đăng ký tài khoản</CardTitle>
            <CardDescription className="text-center">
              Tạo tài khoản mới để bắt đầu mua sắm
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Progress Steps */}
            <div className="flex items-center justify-center mb-8">
              <div className="flex items-center gap-2">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  step >= 1 ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"
                }`}>
                  {step > 1 ? <CheckCircle className="h-5 w-5" /> : "1"}
                </div>
                <span className="text-sm font-medium">Thông tin tài khoản</span>
              </div>
              <div className={`w-12 h-0.5 mx-2 ${step >= 2 ? "bg-blue-600" : "bg-gray-200"}`} />
              <div className="flex items-center gap-2">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  step >= 2 ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"
                }`}>
                  2
                </div>
                <span className="text-sm font-medium">Địa chỉ</span>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {step === 1 && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Tên đăng nhập <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                          name="username"
                          value={formData.username}
                          onChange={handleChange}
                          placeholder="username123"
                          className="pl-10"
                          required
                          autoComplete="username"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Chỉ chữ thường, số và _ . -</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="email@example.com"
                          className="pl-10"
                          required
                          autoComplete="email"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Mật khẩu <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                          name="password"
                          type={showPassword ? "text" : "password"}
                          value={formData.password}
                          onChange={handleChange}
                          placeholder="••••••••"
                          className="pl-10 pr-10"
                          required
                          autoComplete="new-password"
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

                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Xác nhận mật khẩu <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                          name="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          placeholder="••••••••"
                          className="pl-10 pr-10"
                          required
                          autoComplete="new-password"
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
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Họ và tên <span className="text-red-500">*</span>
                    </label>
                    <Input
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      placeholder="Nguyễn Văn A"
                      required
                      autoComplete="name"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Số điện thoại <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                          name="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={handleChange}
                          placeholder="0901234567"
                          className="pl-10"
                          required
                          autoComplete="tel"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Mã số thuế
                      </label>
                      <div className="relative">
                        <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                          name="taxCode"
                          value={formData.taxCode}
                          onChange={handleChange}
                          placeholder="0123456789"
                          className="pl-10"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Không bắt buộc</p>
                    </div>
                  </div>

                  <Button type="button" onClick={handleNext} className="w-full h-11">
                    Tiếp tục
                  </Button>
                </>
              )}

              {step === 2 && (
                <>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Địa chỉ <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        name="shipping.line1"
                        value={formData.shippingAddress.line1}
                        onChange={handleChange}
                        placeholder="123 Đường ABC"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Địa chỉ 2
                    </label>
                    <Input
                      name="shipping.line2"
                      value={formData.shippingAddress.line2}
                      onChange={handleChange}
                      placeholder="Căn hộ, tòa nhà (không bắt buộc)"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Thành phố <span className="text-red-500">*</span>
                      </label>
                      <Input
                        name="shipping.city"
                        value={formData.shippingAddress.city}
                        onChange={handleChange}
                        placeholder="Biên Hòa"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Tỉnh/Thành phố
                      </label>
                      <Input
                        name="shipping.state"
                        value={formData.shippingAddress.state}
                        onChange={handleChange}
                        placeholder="Đồng Nai"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Mã bưu điện
                      </label>
                      <Input
                        name="shipping.postalCode"
                        value={formData.shippingAddress.postalCode}
                        onChange={handleChange}
                        placeholder="700000"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Quốc gia <span className="text-red-500">*</span>
                      </label>
                      <Input
                        name="shipping.country"
                        value={formData.shippingAddress.country}
                        onChange={handleChange}
                        placeholder="VN"
                        maxLength={2}
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">Mã quốc gia 2 ký tự (VD: VN)</p>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="sameAsBilling"
                      checked={formData.sameAsBilling}
                      onChange={handleChange}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">Sử dụng làm địa chỉ thanh toán</span>
                  </label>

                  <div className="flex gap-4">
                    <Button type="button" onClick={handleBack} variant="outline" className="flex-1 h-11">
                      Quay lại
                    </Button>
                    <Button type="submit" className="flex-1 h-11" disabled={isLoading}>
                      {isLoading ? (
                        <span className="flex items-center gap-2">
                          <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Đang xử lý...
                        </span>
                      ) : (
                        "Đăng ký"
                      )}
                    </Button>
                  </div>
                </>
              )}
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Đã có tài khoản?{" "}
                <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                  Đăng nhập ngay
                </Link>
              </p>
            </div>

            <div className="mt-6 relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Hoặc</span>
              </div>
            </div>

            <div className="mt-6">
              <Link href="/">
                <Button variant="outline" className="w-full">
                  Quay lại trang chủ
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-gray-500 mt-6">
          Bằng việc đăng ký, bạn đồng ý với{" "}
          <Link href="#" className="text-blue-600 hover:text-blue-700">
            Điều khoản sử dụng
          </Link>{" "}
          và{" "}
          <Link href="#" className="text-blue-600 hover:text-blue-700">
            Chính sách bảo mật
          </Link>
        </p>
      </div>
    </div>
  )
}