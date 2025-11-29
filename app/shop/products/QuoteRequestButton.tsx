"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";

type QuoteRequestButtonProps = {
  productId?: string | null;
  productName: string;
  productSku?: string | null;
  productSlug?: string | null;
  className?: string;
  children?: React.ReactNode;
};

export default function QuoteRequestButton({
  productId,
  productName,
  productSku,
  productSlug,
  className = "",
  children = "Liên hệ báo giá",
}: QuoteRequestButtonProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const disabled = useMemo(() => submitting || !fullName.trim() || phone.replace(/\\D/g, "").length < 8, [fullName, phone, submitting]);

  const reset = () => {
    setFullName("");
    setPhone("");
    setEmail("");
    setMessage("");
  };

  const handleSubmit = async () => {
    if (disabled) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/quote-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          productId: productId ?? undefined,
          productName,
          quantity: 1,
          message: message.trim() || undefined,
          customerNotes: message.trim() || undefined,
          productSlug: productSlug ?? undefined,
          productSku: productSku ?? undefined,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(data?.message || "Không thể gửi yêu cầu báo giá");
      }

      toast.success("Đã gửi yêu cầu báo giá, chúng tôi sẽ liên hệ sớm!");
      setOpen(false);
      reset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể gửi yêu cầu báo giá");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className || "inline-flex items-center rounded-full border border-amber-500 px-4 py-2 text-sm font-semibold text-amber-600 hover:bg-amber-50"}
      >
        {children}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Yêu cầu báo giá</h3>
                <p className="text-sm text-gray-600">
                  Sản phẩm: <span className="font-semibold text-gray-900">{productName}</span>
                  {productSku ? ` (SKU: ${productSku})` : ""}
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Họ và tên <span className="text-red-500">*</span>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                  placeholder="Nguyễn Văn A"
                  autoComplete="name"
                />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                Số điện thoại <span className="text-red-500">*</span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                  placeholder="0123456789"
                  autoComplete="tel"
                  inputMode="tel"
                />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                Email
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                  placeholder="email@example.com"
                  autoComplete="email"
                  type="email"
                />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                Ghi chú
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                  rows={3}
                  placeholder="Mô tả thêm nhu cầu của bạn..."
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                disabled={submitting}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={disabled}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
              >
                {submitting ? "Đang gửi..." : "Gửi yêu cầu"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
