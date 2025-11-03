"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { User, Mail, Phone, MapPin, Building, Edit, Package, Heart, ShoppingBag } from "lucide-react"
import Link from "next/link"

export default function ProfilePage() {
  // Mock user data
  const user = {
    name: "Nguyễn Văn A",
    email: "nguyenvana@email.com",
    phone: "+84 123 456 789",
    company: "Công ty TNHH ABC",
    address: "123 Đường ABC, Biên Hòa, Đồng Nai",
    avatar: null
  }

  const stats = [
    { label: "Đơn hàng", value: "12", icon: Package },
    { label: "Yêu thích", value: "8", icon: Heart },
    { label: "Giỏ hàng", value: "3", icon: ShoppingBag }
  ]

  const recentOrders = [
    { id: "ORD-001", date: "15/11/2024", status: "Đang giao", total: "15.000.000đ" },
    { id: "ORD-002", date: "10/11/2024", status: "Hoàn thành", total: "8.500.000đ" },
    { id: "ORD-003", date: "05/11/2024", status: "Hoàn thành", total: "12.200.000đ" }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-linear-to-r from-blue-600 to-blue-800 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Avatar */}
            <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border-4 border-white/30">
              <User className="h-12 w-12" />
            </div>
            
            {/* User Info */}
            <div className="text-center md:text-left flex-1">
              <h1 className="text-3xl font-bold mb-2">{user.name}</h1>
              <p className="text-blue-100 mb-4">{user.company}</p>
              <Link href="/profile/edit">
                <Button variant="outline" className="border-white text-white hover:bg-white/10">
                  <Edit className="h-4 w-4 mr-2" />
                  Chỉnh sửa hồ sơ
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 -mt-8 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <Card key={stat.label} className="shadow-lg">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-sm text-gray-600">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            )
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
                    <p className="font-medium">{user.name}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{user.email}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Số điện thoại</p>
                    <p className="font-medium">{user.phone}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Building className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Công ty</p>
                    <p className="font-medium">{user.company}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Địa chỉ</p>
                    <p className="font-medium">{user.address}</p>
                  </div>
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
                <div className="space-y-4">
                  {recentOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Package className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{order.id}</p>
                          <p className="text-sm text-gray-500">{order.date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{order.total}</p>
                        <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                          order.status === "Hoàn thành" 
                            ? "bg-green-100 text-green-800" 
                            : "bg-yellow-100 text-yellow-800"
                        }`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full mt-6">
                  Xem tất cả đơn hàng
                </Button>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>Hành động nhanh</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <Button variant="outline" className="h-20 flex-col">
                    <Heart className="h-6 w-6 mb-2" />
                    Danh sách yêu thích
                  </Button>
                  <Button variant="outline" className="h-20 flex-col">
                    <ShoppingBag className="h-6 w-6 mb-2" />
                    Giỏ hàng
                  </Button>
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
  )
}