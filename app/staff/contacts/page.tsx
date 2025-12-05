// app/staff/contacts/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  UserCheck,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Phone,
  Mail,
  Building2,
  MessageSquare,
  User,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { toast } from "sonner";

type ContactStatus = "new" | "in_progress" | "responded" | "closed" | "spam";
type ContactPriority = "low" | "normal" | "high" | "urgent";

type Contact = {
  id: string;
  code: string;
  fullName: string;
  phone: string;
  email: string | null;
  company: string | null;
  subject: string | null;
  status: ContactStatus;
  priority: ContactPriority;
  assignedTo: string | null;
  createdAt: string;
  respondedAt: string | null;
};

const STATUS_CONFIG: Record<
  ContactStatus,
  { label: string; color: string; icon: React.ComponentType<{ className?: string }> }
> = {
  new: { label: "Mới", color: "bg-blue-100 text-blue-700 border-blue-200", icon: AlertCircle },
  in_progress: { label: "Đang xử lý", color: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock },
  responded: { label: "Đã phản hồi", color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle },
  closed: { label: "Đã đóng", color: "bg-gray-100 text-gray-700 border-gray-200", icon: CheckCircle },
  spam: { label: "Spam", color: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
};

const PRIORITY_CONFIG: Record<ContactPriority, { label: string; color: string }> = {
  low: { label: "Thấp", color: "text-gray-500" },
  normal: { label: "Bình thường", color: "text-blue-500" },
  high: { label: "Cao", color: "text-orange-500" },
  urgent: { label: "Khẩn cấp", color: "text-red-500" },
};

export default function StaffContactsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuthStore();

  const [activeTab, setActiveTab] = useState<"all" | "mine">("all");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ContactStatus | "">("");
  const [priorityFilter, setPriorityFilter] = useState<ContactPriority | "">("");

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "mine") setActiveTab("mine");
    else setActiveTab("all");
  }, [searchParams]);

  const fetchContacts = useCallback(
    async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTab === "mine") params.set("assignedToMe", "true");
      if (statusFilter) params.set("status", statusFilter);
      if (priorityFilter) params.set("priority", priorityFilter);
      if (searchQuery) params.set("q", searchQuery);

      const token = localStorage.getItem("token");
      const response = await fetch(`/api/staff/contacts?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch");

      const result = await response.json();
      setContacts(result.data || []);
    } catch (error) {
      console.error("Fetch contacts error:", error);
      toast.error("Không thể tải danh sách liên hệ");
    } finally {
      setLoading(false);
    }
    },
    [activeTab, priorityFilter, searchQuery, statusFilter],
  );

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  function handleTabChange(tab: "all" | "mine") {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "mine") params.set("tab", "mine");
    else params.delete("tab");
    router.push(`/staff/contacts?${params}`);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    fetchContacts();
  }

  async function handleAssign(contactId: string) {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/staff/contacts/${contactId}/assign`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to assign");
      }

      toast.success("Đã nhận việc xử lý");
      fetchContacts();
    } catch (error) {
      console.error("Assign error:", error);
      toast.error(error instanceof Error ? error.message : "Không thể nhận việc");
    }
  }

  const myContactsCount = contacts.filter((c) => c.assignedTo === user?.id).length;
  const unassignedCount = contacts.filter((c) => !c.assignedTo && c.status === "new").length;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium">Yêu cầu của tôi</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{myContactsCount}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium">Chưa ai nhận</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{unassignedCount}</p>
            </div>
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium">Tổng yêu cầu</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{contacts.length}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="border-b border-slate-200 px-6">
          <div className="flex gap-6">
            <button
              onClick={() => handleTabChange("all")}
              className={`py-4 px-2 border-b-2 font-semibold text-sm transition-colors ${
                activeTab === "all"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              Tất cả yêu cầu
            </button>
            <button
              onClick={() => handleTabChange("mine")}
              className={`py-4 px-2 border-b-2 font-semibold text-sm transition-colors flex items-center gap-2 ${
                activeTab === "mine"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              Yêu cầu của tôi
              {myContactsCount > 0 && (
                <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5">
                  {myContactsCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-slate-200 space-y-4">
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo tên, SĐT, email, mã yêu cầu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-50 outline-none"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Tìm kiếm
            </button>
          </form>

          <div className="flex flex-wrap gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ContactStatus | "")}
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-50 outline-none"
            >
              <option value="">Tất cả trạng thái</option>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as ContactPriority | "")}
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-50 outline-none"
            >
              <option value="">Tất cả mức độ</option>
              {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>

            {(statusFilter || priorityFilter || searchQuery) && (
              <button
                onClick={() => {
                  setStatusFilter("");
                  setPriorityFilter("");
                  setSearchQuery("");
                  fetchContacts();
                }}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 font-medium"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
        </div>

        {/* Contact List */}
        <div className="divide-y divide-slate-200">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : contacts.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">Không có yêu cầu liên hệ nào</p>
            </div>
          ) : (
            contacts.map((contact) => {
              const statusConfig = STATUS_CONFIG[contact.status];
              const StatusIcon = statusConfig.icon;
              const isAssignedToMe = contact.assignedTo === user?.id;
              const canAssign = !contact.assignedTo && activeTab === "all";

              return (
                <div
                  key={contact.id}
                  className="p-6 hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => router.push(`/staff/contacts/${contact.id}`)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-slate-900">{contact.fullName}</h3>
                        <span className="text-sm text-slate-500">#{contact.code}</span>
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusConfig.color}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {statusConfig.label}
                        </span>
                        <span className={`text-xs font-semibold ${PRIORITY_CONFIG[contact.priority].color}`}>
                          {PRIORITY_CONFIG[contact.priority].label}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 mb-2">
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-4 h-4" />
                          {contact.phone}
                        </div>
                        {contact.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-4 h-4" />
                            {contact.email}
                          </div>
                        )}
                        {contact.company && (
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-4 h-4" />
                            {contact.company}
                          </div>
                        )}
                      </div>

                      {contact.subject && (
                        <p className="text-sm text-slate-600 line-clamp-1">{contact.subject}</p>
                      )}

                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                        <span>
                          {new Date(contact.createdAt).toLocaleDateString("vi-VN", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {isAssignedToMe && (
                          <span className="inline-flex items-center gap-1 text-blue-600 font-medium">
                            <User className="w-3 h-3" />
                            Của tôi
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {canAssign && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAssign(contact.id);
                          }}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          Nhận việc
                        </button>
                      )}
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
