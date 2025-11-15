"use client";

import { Share2 } from "lucide-react";
import { toast } from "sonner";

type Props = {
  title: string;
  summary?: string | null;
  url: string;              // URL tuyệt đối
  className?: string;
};

export default function ShareButton({ title, summary, url, className }: Props) {
  const onClick = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title, text: summary ?? title, url });
        toast.success("Đã chia sẻ liên kết thành công");
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Đã sao chép liên kết vào clipboard");
      }
    } catch {
      toast.error("Không thể chia sẻ liên kết. Vui lòng thử lại sau.");
    }
  };

  return (
    <button
      onClick={onClick}
      className={className ?? "inline-flex items-center justify-center gap-2 rounded-xl border px-5 py-3 font-semibold hover:bg-gray-50"}
      title="Chia sẻ"
      type="button"
    >
      <Share2 className="h-5 w-5" />
      Chia sẻ
    </button>
  );
}
