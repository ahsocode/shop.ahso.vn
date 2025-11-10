import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 text-center">
      <h1 className="text-2xl font-semibold mb-2">Không tìm thấy phần mềm</h1>
      <p className="text-gray-600 mb-6">Mục bạn yêu cầu có thể đã bị gỡ hoặc chưa xuất bản.</p>
      <Link href="/shop/software" className="rounded-md border px-4 py-2">Quay lại danh sách</Link>
    </div>
  );
}

