"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Save, Upload } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function EditProfilePage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: "Nguyễn Văn A",
    email: "nguyenvana@email.com",
    phone: "+84 123 456 789",
    company: "Công ty TNHH ABC",
    address: "123 Đường ABC, Biên Hòa, Đồng Nai",
    taxCode: "0123456789",
    website: "https://abc.com"
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle form submission
    console.log("Form data:", formData)
    // Redirect back to profile
    router.push("/profile")
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <Link href="/profile" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay lại hồ sơ
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Chỉnh sửa hồ sơ</h1>
          <p className="text-gray-600">Cập nhật thông tin cá nhân và doanh nghiệp của bạn</p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Avatar Upload */}
          <Card>
            <CardHeader>
              <CardTitle>Ảnh đại diện</CardTitle>
              <CardDescription>Tải lên ảnh đại diện của bạn</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center">
                  <Upload className="h-8 w-8 text-gray-400" />
                </div>
                <div>
                  <Button type="button" variant="outline">
                    Chọn ảnh
                  </Button>
                  <p className="text-sm text-gray-500 mt-2">
                    JPG, PNG hoặc GIF. Kích thước tối đa 2MB
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle>Thông tin cá nhân</CardTitle>
              <CardDescription>Thông tin cơ bản về bạn</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Họ và tên <span className="text-red-500">*</span>
                  </label>
                  <Input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Nhập họ và tên"
                    required
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <Input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Nhập email"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Số điện thoại <span className="text-red-500">*</span>
                </label>
                <Input
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Nhập số điện thoại"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Địa chỉ <span className="text-red-500">*</span>
                </label>
                <Input
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Nhập địa chỉ"
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Company Information */}
          <Card>
            <CardHeader>
              <CardTitle>Thông tin công ty</CardTitle>
              <CardDescription>Thông tin về doanh nghiệp của bạn</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Tên công ty
                </label>
                <Input
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  placeholder="Nhập tên công ty"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Mã số thuế
                  </label>
                  <Input
                    name="taxCode"
                    value={formData.taxCode}
                    onChange={handleChange}
                    placeholder="Nhập mã số thuế"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Website
                  </label>
                  <Input
                    name="website"
                    type="url"
                    value={formData.website}
                    onChange={handleChange}
                    placeholder="https://example.com"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Password Change */}
          <Card>
            <CardHeader>
              <CardTitle>Đổi mật khẩu</CardTitle>
              <CardDescription>Cập nhật mật khẩu của bạn</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Mật khẩu hiện tại
                </label>
                <Input
                  type="password"
                  placeholder="Nhập mật khẩu hiện tại"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Mật khẩu mới
                  </label>
                  <Input
                    type="password"
                    placeholder="Nhập mật khẩu mới"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Xác nhận mật khẩu mới
                  </label>
                  <Input
                    type="password"
                    placeholder="Nhập lại mật khẩu mới"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center gap-4 justify-end">
            <Link href="/profile">
              <Button type="button" variant="outline">
                Hủy
              </Button>
            </Link>
            <Button type="submit">
              <Save className="h-4 w-4 mr-2" />
              Lưu thay đổi
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}