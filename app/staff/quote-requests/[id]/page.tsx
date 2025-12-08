"use client";

import { useState, useEffect, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Phone,
  Mail,
  Calendar,
  User,
  MessageSquare,
  Save,
  CheckCircle,
  Loader2,
  AlertCircle,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/auth-store";

type QuoteStatus = "pending" | "quoted" | "accepted" | "rejected" | "expired" | "converted";
type QuotePriority = "low" | "normal" | "high" | "urgent";

type QuoteDetail = {
  id: string;
  code: string;
  fullName: string;
  phone: string;
  email: string | null;
  productName: string | null;
  quantity: number;
  message: string | null;
  status: QuoteStatus;
  priority: QuotePriority;
  assignedTo: string | null;
  customerNotes: string | null;
  respondedAt: string | null;
  respondedBy: string | null;
  internalNotes: string | null;
  createdAt: string;
  updatedAt: string;
};

const STATUS_OPTIONS: { value: QuoteStatus; label: string }[] = [
  { value: "pending", label: "Chờ xử lý" },
  { value: "quoted", label: "Đã báo giá" },
  { value: "accepted", label: "Khách đồng ý" },
  { value: "rejected", label: "Từ chối" },
  { value: "expired", label: "Hết hạn" },
  { value: "converted", label: "Đã chuyển đơn" },
];

const STATUS_CONFIG: Record<
  QuoteStatus,
  { label: string; color: string }
> = {
  pending: { label: "Chờ xử lý", color: "bg-blue-100 text-blue-700 border-blue-200" },
  quoted: { label: "Đã báo giá", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  accepted: { label: "Khách đồng ý", color: "bg-green-100 text-green-700 border-green-200" },
  rejected: { label: "Từ chối", color: "bg-rose-100 text-rose-700 border-rose-200" },
  expired: { label: "Hết hạn", color: "bg-amber-100 text-amber-700 border-amber-200" },
  converted: { label: "Đã chuyển đơn", color: "bg-purple-100 text-purple-700 border-purple-200" },
};

const PRIORITY_CONFIG: Record<QuotePriority, { label: string; color: string }> = {
  low: { label: "Thấp", color: "text-gray-500" },
  normal: { label: "Bình thường", color: "text-blue-500" },
  high: { label: "Cao", color: "text-orange-500" },
  urgent: { label: "Khẩn cấp", color: "text-red-500" },
};

export default function StaffQuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const user = useAuthStore();

  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [status, setStatus] = useState<QuoteStatus>("pending");
  const [customerNotes, setCustomerNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");

  const fetchQuote = useCallback(async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (!token) {
        toast.error("Bạn cần đăng nhập để xem chi tiết báo giá");
        router.push(`/login?redirect=/staff/quote-requests/${resolvedParams.id}`);
        return;
      }

      const res = await fetch(`/api/staff/quote-requests/${resolvedParams.id}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });

      if (res.status === 401 || res.status === 403) {
        router.push(`/login?redirect=/staff/quote-requests/${resolvedParams.id}`);
        return;
      }

      if (res.status === 404) {
        setQuote(null);
        toast.error("Không tìm thấy yêu cầu báo giá");
        return;
      }

      if (!res.ok) {
        const errorData = (await res.json().catch(() => null)) as { message?: string } | null;
        toast.error(errorData?.message || "Không thể tải yêu cầu báo giá");
        setQuote(null);
        return;
      }

      const result = await res.json();
      const data: QuoteDetail = result.data;

      setQuote(data);
      setStatus(data.status);
      setCustomerNotes(data.customerNotes || "");
      setInternalNotes(data.internalNotes || "");
    } catch (error) {
      console.error("Fetch quote error:", error);
      toast.error("Không thể tải thông tin báo giá");
    } finally {
      setLoading(false);
    }
  }, [resolvedParams.id, router]);

  useEffect(() => {
    fetchQuote();
  }, [fetchQuote]);

  async function handleSave() {
    if (!quote) return;

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/staff/quote-requests/${resolvedParams.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status,
          customerNotes: customerNotes.trim() || undefined,
          internalNotes: internalNotes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const errorData = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(errorData?.message || "Failed to save");
      }

      toast.success("Đã lưu thông tin báo giá");
      fetchQuote();
    } catch (error) {
      console.error("Save quote error:", error);
      toast.error("Không thể lưu thông tin");
    } finally {
      setSaving(false);
    }
  }

  async function handleAssign() {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/staff/quote-requests/${resolvedParams.id}/assign`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const error = await res.json().catch(() => null);
        throw new Error(error?.message || "Failed to assign");
      }

      toast.success("Đã nhận xử lý báo giá");
      fetchQuote();
    } catch (error) {
      console.error("Assign error:", error);
      toast.error(error instanceof Error ? error.message : "Không thể nhận báo giá");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500">Không tìm thấy yêu cầu báo giá</p>
      </div>
    );
  }

  const isAssignedToMe = quote.assignedTo === user?.id;
  const canAssign = !quote.assignedTo;

  const statusConfig = STATUS_CONFIG[quote.status];
  const priorityConfig = PRIORITY_CONFIG[quote.priority];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          Quay lại
        </button>

        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${statusConfig.color}`}
          >
            {statusConfig.label}
          </span>
          <span className={`text-xs font-semibold ${priorityConfig.color}`}>
            {priorityConfig.label}
          </span>

          {canAssign && (
            <button
              onClick={handleAssign}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Nhận xử lý báo giá
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Customer & Quote Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="font-bold text-slate-900 mb-4">Thông tin báo giá</h2>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-slate-500 mb-1">Mã yêu cầu</div>
                <div className="font-semibold text-slate-900">#{quote.code}</div>
              </div>
              <div>
                <div className="text-sm text-slate-500 mb-1">Khách hàng</div>
                <div className="font-semibold text-slate-900">{quote.fullName}</div>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-400" />
                <a
                  href={`tel:${quote.phone}`}
                  className="text-blue-600 hover:underline"
                >
                  {quote.phone}
                </a>
              </div>
              {quote.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <a
                    href={`mailto:${quote.email}`}
                    className="text-blue-600 hover:underline truncate"
                  >
                    {quote.email}
                  </a>
                </div>
              )}

              {quote.productName && (
                <div className="flex items-start gap-2">
                  <Package className="w-4 h-4 text-slate-400 mt-1" />
                  <div>
                    <div className="text-sm text-slate-500 mb-1">Sản phẩm</div>
                    <div className="font-semibold text-slate-900">
                      {quote.productName}
                    </div>
                    <div className="text-sm text-slate-600">
                      Số lượng: <span className="font-medium">{quote.quantity}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-600">
                  {new Date(quote.createdAt).toLocaleDateString("vi-VN", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              <div className="space-y-1">
                <div className="text-sm text-slate-500">Trạng thái</div>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${statusConfig.color}`}
                >
                  {statusConfig.label}
                </span>
              </div>

              <div className="space-y-1">
                <div className="text-sm text-slate-500">Mức độ ưu tiên</div>
                <span className={`text-xs font-semibold ${priorityConfig.color}`}>
                  {priorityConfig.label}
                </span>
              </div>

              {isAssignedToMe && (
                <div className="flex items-center gap-2 text-blue-600">
                  <User className="w-4 h-4" />
                  <span className="font-medium text-sm">Được phân công cho bạn</span>
                </div>
              )}
              {!isAssignedToMe && quote.assignedTo && (
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <User className="w-4 h-4" />
                  <span>Đã phân công cho nhân sự khác</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Message & Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Request Message */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              Yêu cầu từ khách hàng
            </h3>
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <p className="text-slate-700 whitespace-pre-wrap">
                {quote.message || "Không có nội dung ghi chú thêm"}
              </p>
            </div>
          </div>

          {/* Status & Response Update */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4">Cập nhật xử lý báo giá</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Trạng thái
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as QuoteStatus)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-50 outline-none"
                  disabled={!isAssignedToMe}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nội dung báo giá / phản hồi cho khách
                </label>
                <textarea
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  rows={6}
                  placeholder="Nhập nội dung báo giá, điều kiện, ghi chú gửi cho khách..."
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-50 outline-none resize-none"
                  disabled={!isAssignedToMe}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Ghi chú nội bộ
                </label>
                <textarea
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  rows={4}
                  placeholder="Ghi chú nội bộ, khách hàng không thấy..."
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-50 outline-none resize-none"
                  disabled={!isAssignedToMe}
                />
              </div>

              {isAssignedToMe && (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg font-medium transition-colors"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Lưu thông tin
                    </>
                  )}
                </button>
              )}

              {!isAssignedToMe && !canAssign && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                  <AlertCircle className="w-4 h-4 inline mr-2" />
                  Yêu cầu này đã được phân công cho nhân sự khác
                </div>
              )}
            </div>
          </div>

          {/* Response History */}
          {quote.respondedAt && (
            <div className="bg-green-50 rounded-xl border border-green-200 p-6">
              <div className="flex items-center gap-2 text-green-700 font-semibold mb-3">
                <CheckCircle className="w-5 h-5" />
                Đã gửi báo giá / phản hồi
              </div>
              <div className="text-sm text-green-600 mb-2">
                {new Date(quote.respondedAt).toLocaleDateString("vi-VN", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
              {quote.customerNotes && (
                <div className="bg-white rounded-lg p-4 text-slate-700 whitespace-pre-wrap">
                  {quote.customerNotes}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
