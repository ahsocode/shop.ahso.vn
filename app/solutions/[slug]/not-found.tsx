import NotFoundPage from "@/components/not-found/NotFoundPage";

export default function NotFound() {
  return (
    <NotFoundPage
      title="Không tìm thấy giải pháp"
      description="Giải pháp bạn đang tìm không tồn tại hoặc đã được chuyển sang danh mục khác."
      primaryHref="/solutions"
      primaryLabel="Xem giải pháp"
      secondaryHref="/"
      secondaryLabel="Về trang chủ"
    />
  );
}

