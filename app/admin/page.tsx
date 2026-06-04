"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  ImageIcon,
  Inbox,
  Laptop,
  Layers,
  Loader2,
  Mail,
  Megaphone,
  Save,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { makeHeaders } from "@/app/admin/_lib/fetcher";

type DashboardOverview = {
  stats: {
    contacts: number;
    quoteRequests: number;
    softwares: number;
    solutions: number;
    heroBanners: number;
    announcements: number;
    users: number;
  };
  recentContacts: Array<{
    id: string;
    code: string;
    fullName: string;
    phone: string;
    subject: string | null;
    status: string;
    createdAt: string;
  }>;
  recentQuotes: Array<{
    id: string;
    code: string;
    fullName: string;
    phone: string;
    productName: string | null;
    status: string;
    createdAt: string;
  }>;
};

type ContactEmailResponse = {
  data: {
    email: string;
  };
};

const statCards = [
  { key: "contacts", label: "Liên hệ", icon: Inbox },
  { key: "quoteRequests", label: "Báo giá", icon: FileText },
  { key: "softwares", label: "Phần mềm", icon: Laptop },
  { key: "solutions", label: "Giải pháp", icon: Layers },
  { key: "heroBanners", label: "Banner", icon: ImageIcon },
  { key: "announcements", label: "Banner quảng cáo", icon: Megaphone },
  { key: "users", label: "Người dùng", icon: Users },
] as const;

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: makeHeaders(), cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as T;
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [emailSaving, setEmailSaving] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadDashboard() {
      setLoading(true);
      try {
        const [overview, emailData] = await Promise.all([
          fetchJSON<DashboardOverview>("/api/admin/dashboard/overview"),
          fetchJSON<ContactEmailResponse>("/api/admin/system-settings/contact-email"),
        ]);

        if (!ignore) {
          setData(overview);
          setEmail(emailData.data.email);
        }
      } catch (error) {
        console.error("Dashboard overview failed:", error);
        if (!ignore) {
          setData(null);
          toast.error("Không tải được dữ liệu dashboard.");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    void loadDashboard();
    return () => {
      ignore = true;
    };
  }, []);

  async function handleSaveEmail(event: React.FormEvent) {
    event.preventDefault();
    const nextEmail = email.trim();

    if (!nextEmail) {
      toast.warning("Vui lòng nhập email nhận thông báo.");
      return;
    }

    setEmailSaving(true);
    const toastId = toast.loading("Đang lưu email nhận thông báo...");

    try {
      const res = await fetch("/api/admin/system-settings/contact-email", {
        method: "PUT",
        headers: makeHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ email: nextEmail }),
      });
      if (!res.ok) throw new Error(await res.text());

      const json = (await res.json()) as ContactEmailResponse;
      setEmail(json.data.email);
      toast.success("Đã cập nhật email nhận thông báo.", { id: toastId });
    } catch (error) {
      console.error("Failed to update contact notification email", error);
      toast.error("Không thể cập nhật email nhận thông báo.", { id: toastId });
    } finally {
      setEmailSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-[420px] place-items-center">
        <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          Đang tải dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;

          return (
            <div key={card.key} className="rounded-md border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-50 text-blue-700">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-2xl font-semibold text-slate-950">{data?.stats[card.key] ?? 0}</span>
              </div>
              <p className="mt-4 text-sm font-semibold text-slate-700">{card.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="grid gap-6 lg:grid-cols-2">
          <RecentTable
            emptyText="Chưa có liên hệ."
            items={data?.recentContacts ?? []}
            title="Liên hệ mới"
            valueLabel={(item) => item.subject || item.phone}
          />
          <RecentTable
            emptyText="Chưa có yêu cầu báo giá."
            items={data?.recentQuotes ?? []}
            title="Báo giá mới"
            valueLabel={(item) => item.productName || item.phone}
          />
        </div>

        <section className="rounded-md border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-950">Email nhận thông báo</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Nhận thông báo khi khách gửi liên hệ hoặc yêu cầu báo giá.
                </p>
              </div>
            </div>
          </div>

          <form className="grid gap-4 p-5" onSubmit={handleSaveEmail}>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              Email nhận thông báo
              <input
                className="h-10 rounded-md border border-slate-300 px-3 text-sm font-normal text-slate-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="sales@ahso.vn"
                type="email"
                value={email}
              />
            </label>
            <button
              className="inline-flex h-10 w-fit items-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={emailSaving}
              type="submit"
            >
              {emailSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Lưu email
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

function RecentTable<T extends { id: string; code: string; fullName: string; status: string; createdAt: string }>({
  emptyText,
  items,
  title,
  valueLabel,
}: {
  emptyText: string;
  items: T[];
  title: string;
  valueLabel: (item: T) => string;
}) {
  return (
    <section className="rounded-md border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      </div>
      {items.length === 0 ? (
        <div className="px-5 py-8 text-sm text-slate-500">{emptyText}</div>
      ) : (
        <div className="divide-y divide-slate-100">
          {items.map((item) => (
            <div key={item.id} className="grid gap-1 px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <p className="min-w-0 truncate text-sm font-semibold text-slate-950">{item.fullName}</p>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                  {item.status}
                </span>
              </div>
              <p className="text-xs leading-5 text-slate-500">
                {item.code} · {valueLabel(item)} · {new Date(item.createdAt).toLocaleString("vi-VN")}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
