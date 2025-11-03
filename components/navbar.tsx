"use client"

import Link from "next/link"
import { ShoppingCart, User, Menu, Factory } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import Image from "next/image"

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/95 backdrop-blur supports-backdrop-filter:bg-white/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-gray-900">
             <Image
              src="/logo.png"
              alt="AHSO Logo"
              width={32}
              height={32}
              className="h-8 w-8 object-contain"
              priority
            />
            <span>AHSO</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">
              Trang chủ
            </Link>
            <Link href="/shop" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">
              Sản phẩm
            </Link>
            <Link href="#" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">
              Về chúng tôi
            </Link>
            <Link href="#" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">
              Liên hệ
            </Link>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon">
              <ShoppingCart className="h-5 w-5" />
            </Button>
            <Link href="/profile">
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
            </Link>
            <Button className="hidden md:inline-flex" size="sm">
              Đăng nhập
            </Button>
            
            {/* Mobile Menu Button */}
            <Button 
              variant="ghost" 
              size="icon"
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 space-y-2 border-t border-gray-200">
            <Link href="/" className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md">
              Trang chủ
            </Link>
            <Link href="/shop" className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md">
              Sản phẩm
            </Link>
            <Link href="#" className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md">
              Về chúng tôi
            </Link>
            <Link href="#" className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md">
              Liên hệ
            </Link>
            <div className="px-4 pt-2">
              <Button className="w-full" size="sm">
                Đăng nhập
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}