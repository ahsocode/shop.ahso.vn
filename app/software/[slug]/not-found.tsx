import NotFoundPage from "@/components/not-found/NotFoundPage";

export default function NotFound() {
  return (
    <NotFoundPage
      title="Không tìm thấy phần mềm"
      description="Phần mềm bạn đang tìm không tồn tại hoặc hiện chưa được công khai."
      primaryHref="/software"
      primaryLabel="Xem phần mềm"
      secondaryHref="/"
      secondaryLabel="Về trang chủ"
    />
  );
}
