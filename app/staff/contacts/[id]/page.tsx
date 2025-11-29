// app/staff/contacts/[id]/page.tsx
"use client";

import { useState, useEffect, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Phone,
  Mail,
  Building2,
  Calendar,
  User,
  MessageSquare,
  Save,
  CheckCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/auth-store";

type ContactStatus = "new" | "in_progress" | "responded" | "closed" | "spam";
type ContactPriority = "low" | "normal" | "high" | "urgent";

type ContactDetail = {
  id: string;
  code: string;
  fullName: string;
  phone: string;
  email: string | null;
  company: string | null;
  subject: string | null;
  message: string;
  status: ContactStatus;
  priority: ContactPriority;
  assignedTo: string | null;
  response: string | null;
  respondedAt: string | null;
  respondedBy: string | null;
  internalNotes: string | null;
  createdAt: string;
  updatedAt: string;
  contacttype: { id: string; name: string; slug: string } | null;
};

const STATUS_OPTIONS: { value: ContactStatus; label: string }[] = [
  { value: "new", label: "Mới" },
  { value: "in_progress", label: "Đang xử lý" },
  { value: "responded", label: "Đã phản hồi" },
  { value: "closed", label: "Đã đóng" },
  { value: "spam", label: "Spam" },
];

export default function StaffContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const user = useAuthStore();

  const [contact, setContact] = useState<ContactDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [status, setStatus] = useState<ContactStatus>("new");
  const [response, setResponse] = useState("");
  const [internalNotes, setInternalNotes] = useState("");

  const fetchContact = useCallback(async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (!token) {
        toast.error("Bạn cần đăng nhập để xem chi tiết liên hệ");
        router.push(`/login?redirect=/staff/contacts/${resolvedParams.id}`);
        return;
      }

      const res = await fetch(`/api/staff/contacts/${resolvedParams.id}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });

      if (res.status === 401 || res.status === 403) {
        router.push(`/login?redirect=/staff/contacts/${resolvedParams.id}`);
        return;
      }

      if (res.status === 404) {
        setContact(null);
        toast.error("Không tìm thấy yêu cầu liên hệ");
        return;
      }

      if (!res.ok) {
        const errorData = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(errorData?.message || "Failed to fetch");
      }

      const result = await res.json();
      setContact(result.data);
      setStatus(result.data.status);
      setResponse(result.data.response || "");
      setInternalNotes(result.data.internalNotes || "");
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Không thể tải thông tin liên hệ");
    } finally {
      setLoading(false);
    }
  }, [resolvedParams.id, router]);

  useEffect(() => {
    fetchContact();
  }, [fetchContact]);

  async function handleSave() {
    if (!contact) return;

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/staff/contacts/${resolvedParams.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status,
          response: response.trim() || undefined,
          internalNotes: internalNotes.trim() || undefined,
        }),
      });

      if (!res.ok) throw new Error("Failed to save");

      toast.success("Đã lưu thông tin");
      fetchContact();
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Không thể lưu thông tin");
    } finally {
      setSaving(false);
    }
  }

  async function handleAssign() {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/staff/contacts/${resolvedParams.id}/assign`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to assign");
      }

      toast.success("Đã nhận việc xử lý");
      fetchContact();
    } catch (error) {
      console.error("Assign error:", error);
      toast.error(error instanceof Error ? error.message : "Không thể nhận việc");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500">Không tìm thấy yêu cầu liên hệ</p>
      </div>
    );
  }

  const isAssignedToMe = contact.assignedTo === user?.id;
  const canAssign = !contact.assignedTo;

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

        {canAssign && (
          <button
            onClick={handleAssign}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Nhận việc xử lý
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Customer Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="font-bold text-slate-900 mb-4">Thông tin khách hàng</h2>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-slate-500 mb-1">Mã yêu cầu</div>
                <div className="font-semibold text-slate-900">#{contact.code}</div>
              </div>
              <div>
                <div className="text-sm text-slate-500 mb-1">Họ tên</div>
                <div className="font-semibold text-slate-900">{contact.fullName}</div>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-400" />
                <a
                  href={`tel:${contact.phone}`}
                  className="text-blue-600 hover:underline"
                >
                  {contact.phone}
                </a>
              </div>
              {contact.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <a
                    href={`mailto:${contact.email}`}
                    className="text-blue-600 hover:underline truncate"
                  >
                    {contact.email}
                  </a>
                </div>
              )}
              {contact.company && (
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-700">{contact.company}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-600">
                  {new Date(contact.createdAt).toLocaleDateString("vi-VN", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              {isAssignedToMe && (
                <div className="flex items-center gap-2 text-blue-600">
                  <User className="w-4 h-4" />
                  <span className="font-medium text-sm">Được phân công cho bạn</span>
                </div>
              )}
            </div>
          </div>

          {contact.contacttype && (
            <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
              <div className="text-sm text-blue-600 font-medium">Loại yêu cầu</div>
              <div className="text-blue-900 font-semibold mt-1">
                {contact.contacttype.name}
              </div>
            </div>
          )}
        </div>

        {/* Right: Message & Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Message */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              Nội dung yêu cầu
            </h3>
            {contact.subject && (
              <div className="mb-3">
                <div className="text-sm text-slate-500 mb-1">Chủ đề</div>
                <div className="font-semibold text-slate-900">{contact.subject}</div>
              </div>
            )}
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <p className="text-slate-700 whitespace-pre-wrap">{contact.message}</p>
            </div>
          </div>

          {/* Status Update */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4">Cập nhật trạng thái</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Trạng thái
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ContactStatus)}
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
                  Phản hồi cho khách hàng
                </label>
                <textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  rows={6}
                  placeholder="Nhập nội dung phản hồi..."
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
                  placeholder="Ghi chú riêng, khách hàng không thấy..."
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
                  Yêu cầu này đã được phân công cho staff khác
                </div>
              )}
            </div>
          </div>

          {/* Response History */}
          {contact.respondedAt && (
            <div className="bg-green-50 rounded-xl border border-green-200 p-6">
              <div className="flex items-center gap-2 text-green-700 font-semibold mb-3">
                <CheckCircle className="w-5 h-5" />
                Đã phản hồi
              </div>
              <div className="text-sm text-green-600 mb-2">
                {new Date(contact.respondedAt).toLocaleDateString("vi-VN", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
              {contact.response && (
                <div className="bg-white rounded-lg p-4 text-slate-700 whitespace-pre-wrap">
                  {contact.response}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
