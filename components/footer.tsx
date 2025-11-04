import Link from "next/link"
import { Factory, Mail, Phone, MapPin, Building2 } from "lucide-react"
import Image from "next/image"

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
         
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl text-white">
               <Image
              src="/logo.png"
              alt="AHSO Logo"
              width={32}
              height={32}
              className="h-8 w-8 object-contain"
              priority
            />
              <span>AHSO </span>
            </Link>
            <p className="text-sm text-gray-400">
              Cung cấp máy móc, thiết bị và linh kiện công nghiệp chất lượng cao cho doanh nghiệp Việt Nam.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-white mb-4">Liên kết nhanh</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-sm hover:text-blue-500 transition-colors">
                  Trang chủ
                </Link>
              </li>
              <li>
                <Link href="/shop" className="text-sm hover:text-blue-500 transition-colors">
                  Sản phẩm
                </Link>
              </li>
              <li>
                <Link href="#" className="text-sm hover:text-blue-500 transition-colors">
                  Về chúng tôi
                </Link>
              </li>
              <li>
                <Link href="#" className="text-sm hover:text-blue-500 transition-colors">
                  Liên hệ
                </Link>
              </li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h3 className="font-semibold text-white mb-4">Danh mục</h3>
            <ul className="space-y-2">
              <li>
                <Link href="#" className="text-sm hover:text-blue-500 transition-colors">
                  Máy móc công nghiệp
                </Link>
              </li>
              <li>
                <Link href="#" className="text-sm hover:text-blue-500 transition-colors">
                  Linh kiện điện tử
                </Link>
              </li>
              <li>
                <Link href="#" className="text-sm hover:text-blue-500 transition-colors">
                  Thiết bị đo lường
                </Link>
              </li>
              <li>
                <Link href="#" className="text-sm hover:text-blue-500 transition-colors">
                  Phụ tùng thay thế
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-white mb-4">Liên hệ</h3>
            <ul className="space-y-3">
                <li className="flex items-start gap-2">
                <Building2 className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                <span className="text-sm">CÔNG TY TNHH AHSO</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                <span className="text-sm">39/15 Đường Cao Bá Quát, Khu Phố Đông Tân, Phường Dĩ An, Thành phố Hồ Chí Minh, Việt Nam.</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-blue-500 shrink-0" />
                <span className="text-sm">0901 951 351</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-blue-500 shrink-0" />
                <span className="text-sm">sales@ahso.vn</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-800 text-center text-sm text-gray-400">
          <p>&copy; {new Date().getFullYear()} AHSO Industrial. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}