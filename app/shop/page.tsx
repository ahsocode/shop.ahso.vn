"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter, Package } from "lucide-react";

type Product = {
  id: string;
  name: string;
  description?: string;
  price: number; // lưu số, hiển thị format khi render
  imageUrl?: string;
  category?: string;
};

export default function ShopPage() {
  const [searchQuery, setSearchQuery] = useState("");

  // Mock data - sẽ thay bằng API sau
  const products: Product[] = []; // <-- gán kiểu tường minh để tránh any[]

  const formatPrice = (v: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(v);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Sản phẩm</h1>
          <p className="text-gray-600">
            Khám phá hàng nghìn sản phẩm công nghiệp chất lượng cao
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filters */}
          <aside className="lg:w-64 shrink-0">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Bộ lọc
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Search */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Tìm kiếm</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Tìm sản phẩm..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                {/* Categories */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Danh mục</label>
                  <div className="space-y-2">
                    {[
                      "Máy công nghiệp",
                      "Linh kiện điện",
                      "Dụng cụ đo",
                      "Phụ tùng",
                      "Thiết bị an toàn",
                    ].map((category) => (
                      <label key={category} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="rounded border-gray-300" />
                        <span className="text-sm text-gray-700">{category}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Khoảng giá</label>
                  <div className="flex items-center gap-2">
                    <Input type="number" placeholder="Từ" className="text-sm" />
                    <span className="text-gray-400">-</span>
                    <Input type="number" placeholder="Đến" className="text-sm" />
                  </div>
                </div>

                <Button className="w-full">Áp dụng bộ lọc</Button>
              </CardContent>
            </Card>
          </aside>

          {/* Products Grid */}
          <div className="flex-1">
            {/* Sort Bar */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Hiển thị <span className="font-medium">{products.length}</span> sản phẩm
              </p>
              <select className="text-sm border border-gray-300 rounded-md px-3 py-1.5">
                <option>Mới nhất</option>
                <option>Giá thấp đến cao</option>
                <option>Giá cao đến thấp</option>
                <option>Tên A-Z</option>
              </select>
            </div>

            {/* Empty State */}
            {products.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Package className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Chưa có sản phẩm</h3>
                  <p className="text-gray-600 text-center max-w-md mb-6">
                    Hiện tại chúng tôi đang cập nhật danh sách sản phẩm. Vui lòng quay lại sau
                    hoặc liên hệ với chúng tôi để được tư vấn.
                  </p>
                  <Button>Liên hệ tư vấn</Button>
                </CardContent>
              </Card>
            )}

            {/* Products Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <Card key={product.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="aspect-square bg-gray-100 rounded-lg mb-4">
                      {/* <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover rounded-lg" /> */}
                    </div>
                    <CardTitle className="line-clamp-2">{product.name}</CardTitle>
                    {product.description && (
                      <CardDescription className="line-clamp-2">
                        {product.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardFooter className="flex items-center justify-between">
                    <span className="text-lg font-bold text-blue-600">
                      {formatPrice(product.price)}
                    </span>
                    <Button size="sm">Thêm vào giỏ</Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
