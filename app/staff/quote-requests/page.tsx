"use client";

import { useEffect, useState, useCallback } from "react";
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
  MessageSquare,
  User,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/auth-store";

type QuoteStatus = "pending" | "quoted" | "accepted" | "rejected" | "expired" | "converted";
type QuotePriority = "low" | "normal" | "high" | "urgent";

type QuoteItem = {
  id: string;
  code: string;
  fullName: string;
  phone: string;
  email: string | null;
  productName: string | null;
  quantity: number;
  status: QuoteStatus;
  priority: QuotePriority;
  assignedTo: string | null;
  createdAt: string;
  message: string | null;
};

const STATUS_CONFIG: Record<
  QuoteStatus,
  { label: string; color: string; icon: React.ComponentType<{ className?: string }> }
> = {
  pending: { label: "Chờ xử lý", color: "bg-blue-100 text-blue-700 border-blue-200", icon: AlertCircle },
  quoted: { label: "Đã báo giá", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle },
  accepted: { label: "Khách đồng ý", color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle },
  rejected: { label: "Từ chối", color: "bg-rose-100 text-rose-700 border-rose-200", icon: XCircle },
  expired: { label: "Hết hạn", color: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock },
  converted: { label: "Đã chuyển đơn", color: "bg-purple-100 text-purple-700 border-purple-200", icon: CheckCircle },
};

const PRIORITY_CONFIG: Record<QuotePriority, { label: string; color: string }> = {
  low: { label: "Thấp", color: "text-gray-500" },
  normal: { label: "Bình thường", color: "text-blue-500" },
  high: { label: "Cao", color: "text-orange-500" },
  urgent: { label: "Khẩn cấp", color: "text-red-500" },
};

export default function StaffQuoteRequestsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuthStore();

  const [activeTab, setActiveTab] = useState<"all" | "mine">("all");
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | "">("");
  const [priorityFilter, setPriorityFilter] = useState<QuotePriority | "">("");

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "mine") setActiveTab("mine");
    else setActiveTab("all");
  }, [searchParams]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTab === "mine") params.set("assignedToMe", "true");
      if (statusFilter) params.set("status", statusFilter);
      if (priorityFilter) params.set("priority", priorityFilter);
      if (searchQuery.trim()) params.set("q", searchQuery.trim());

      const token = localStorage.getItem("token");
      const res = await fetch(`/api/staff/quote-requests?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!res.ok) throw new Error("Fetch failed");
      const json = (await res.json()) as { data: QuoteItem[] };
      setItems(json.data || []);
    } catch (err) {
      console.error("Fetch quote requests error:", err);
      toast.error("Không thể tải yêu cầu báo giá");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, statusFilter, priorityFilter, searchQuery]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  function handleTabChange(tab: "all" | "mine") {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "mine") params.set("tab", "mine");
    else params.delete("tab");
    router.push(`/staff/quote-requests?${params.toString()}`);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    fetchItems();
  }

  const handleAssign = async (id: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/staff/quote-requests/${id}/assign`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(data?.message || "Không thể nhận báo giá");
      }
      toast.success("Đã nhận xử lý báo giá");
      fetchItems();
    } catch (err) {
      console.error("Assign quote error:", err);
      toast.error(err instanceof Error ? err.message : "Không thể nhận báo giá");
    }
  };

  const handleUnassign = async (id: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/staff/quote-requests/${id}/assign`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(data?.message || "Không thể trả lại báo giá");
      }
      toast.success("Đã trả lại báo giá");
      fetchItems();
    } catch (err) {
      console.error("Unassign quote error:", err);
      toast.error(err instanceof Error ? err.message : "Không thể trả lại báo giá");
    }
  };

  const myId = user?.id;
  const myQuotesCount = items.filter((q) => q.assignedTo === myId).length;
  const unassignedCount = items.filter((q) => !q.assignedTo && q.status === "pending").length;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium">Báo giá của tôi</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{myQuotesCount}</p>
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
              <p className="text-sm text-slate-500 font-medium">Tổng yêu cầu báo giá</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{items.length}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs + Filters + List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        {/* Tabs */}
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
              {myQuotesCount > 0 && (
                <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5">
                  {myQuotesCount}
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
                placeholder="Tìm theo tên, SĐT, email, mã yêu cầu, sản phẩm..."
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
              onChange={(e) => setStatusFilter(e.target.value as QuoteStatus | "")}
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
              onChange={(e) => setPriorityFilter(e.target.value as QuotePriority | "")}
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
                type="button"
                onClick={() => {
                  setStatusFilter("");
                  setPriorityFilter("");
                  setSearchQuery("");
                  fetchItems();
                }}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 font-medium"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
        </div>

        {/* Quote List */}
        <div className="divide-y divide-slate-200">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">Không có yêu cầu báo giá nào</p>
            </div>
          ) : (
            items.map((item) => {
              const statusCfg = STATUS_CONFIG[item.status];
              const StatusIcon = statusCfg.icon;
              const isAssignedToMe = item.assignedTo === myId;
              const canAssign = !item.assignedTo && activeTab === "all";

              return (
                <div
                  key={item.id}
                  className="p-6 hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => router.push(`/staff/quote-requests/${item.id}`)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-slate-900">{item.fullName}</h3>
                        <span className="text-sm text-slate-500">#{item.code}</span>
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusCfg.color}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {statusCfg.label}
                        </span>
                        <span
                          className={`text-xs font-semibold ${PRIORITY_CONFIG[item.priority].color}`}
                        >
                          {PRIORITY_CONFIG[item.priority].label}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 mb-2">
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-4 h-4" />
                          {item.phone}
                        </div>
                        {item.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-4 h-4" />
                            {item.email}
                          </div>
                        )}
                        {item.productName && (
                          <div className="flex items-center gap-1.5">
                            <CheckCircle className="w-4 h-4" />
                            {item.productName} × {item.quantity}
                          </div>
                        )}
                      </div>

                      {item.message && (
                        <p className="text-sm text-slate-600 line-clamp-2">{item.message}</p>
                      )}

                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                        <span>
                          {new Date(item.createdAt).toLocaleDateString("vi-VN", {
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
                            handleAssign(item.id);
                          }}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          Nhận báo giá
                        </button>
                      )}
                      {isAssignedToMe && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUnassign(item.id);
                          }}
                          className="px-4 py-2 border border-slate-300 hover:bg-slate-100 rounded-lg text-sm font-medium text-slate-700 transition-colors"
                        >
                          Trả lại
                        </button>
                      )}
                      {!canAssign && !isAssignedToMe && item.assignedTo && (
                        <span className="text-xs text-slate-500">Đã gán cho người khác</span>
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
