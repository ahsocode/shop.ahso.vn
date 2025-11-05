// app/shop/solution/[slug]/not-found.tsx
export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 text-center">
      <h1 className="text-2xl md:text-3xl font-bold mb-3">Không tìm thấy giải pháp</h1>
      <p className="text-gray-600 mb-6">
        Có thể nội dung đã bị gỡ hoặc chưa được xuất bản.
      </p>
      <a
        href="/shop/solutions"
        className="inline-flex items-center rounded-lg border px-5 py-3 font-semibold hover:bg-gray-50"
      >
        Quay lại danh sách giải pháp
      </a>
    </div>
  );
}
