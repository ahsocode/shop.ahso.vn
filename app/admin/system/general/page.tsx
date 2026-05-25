"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, Percent } from "lucide-react";
import { toast } from "sonner";
import { makeHeaders } from "@/app/admin/_lib/fetcher";

type OrderEmailResp = { data: { email: string } };
type TaxResp = { data: { rate: number } };

const fetchJSON = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url, { headers: makeHeaders() });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as T;
};

export default function SystemOverviewPage() {
  const [pageLoading, setPageLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [taxRate, setTaxRate] = useState(0.1);
  const [taxSaving, setTaxSaving] = useState(false);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const [emailData, taxData] = await Promise.all([
          fetchJSON<OrderEmailResp>("/api/admin/system-settings/order-email"),
          fetchJSON<TaxResp>("/api/admin/system-settings/tax"),
        ]);
        if (ignore) return;
        setEmail(emailData.data.email);
        setTaxRate(taxData.data.rate ?? 0.1);
      } catch (error) {
        console.error("Failed to load settings", error);
        toast.error("Không tải được dữ liệu hệ thống.");
      } finally {
        if (!ignore) setPageLoading(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, []);

  async function handleSaveEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Email không được để trống.");
      return;
    }
    setEmailSaving(true);
    try {
      const res = await fetch("/api/admin/system-settings/order-email", {
        method: "PUT",
        headers: makeHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Đã cập nhật email nhận thông báo.");
    } catch (error) {
      console.error("Failed to update email", error);
      toast.error("Không thể cập nhật email.");
    } finally {
      setEmailSaving(false);
    }
  }

  async function handleSaveTax(e: React.FormEvent) {
    e.preventDefault();
    if (taxRate < 0 || taxRate > 1) {
      toast.error("Thuế không hợp lệ.");
      return;
    }
    setTaxSaving(true);
    try {
      const res = await fetch("/api/admin/system-settings/tax", {
        method: "PUT",
        headers: makeHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ rate: taxRate * 100 }),
      });
      if (!res.ok) throw new Error(await res.text());
      const json: TaxResp = await res.json();
      setTaxRate(json.data.rate);
      toast.success("Đã cập nhật thuế hiển thị.");
    } catch (error) {
      console.error("Failed to update tax", error);
      toast.error("Không thể cập nhật thuế.");
    } finally {
      setTaxSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Quản lý hệ thống</h1>
        <p className="text-gray-600">Cấu hình email và thuế hiển thị trên website.</p>
      </header>

      {pageLoading ? (
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Đang tải dữ liệu...
        </div>
      ) : (
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              Email nhận thông báo đơn hàng
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Địa chỉ email này sẽ nhận được thông báo mỗi khi khách đặt hàng mới.
            </p>
            <form onSubmit={handleSaveEmail} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                  placeholder="orders@ahso.vn"
                />
              </div>
              <button
                type="submit"
                disabled={emailSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-60"
              >
                {emailSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Đang lưu...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" /> Lưu thay đổi
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Percent className="h-5 w-5 text-blue-500" />
              <h2 className="text-lg font-semibold text-gray-900">Thuế (VAT)</h2>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Tỷ lệ thuế hiển thị ở trang thanh toán (áp dụng toàn bộ đơn hàng).
            </p>
            <form onSubmit={handleSaveTax} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Thuế (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={Math.round(taxRate * 1000) / 10}
                  onChange={(e) => setTaxRate(Number(e.target.value) / 100)}
                  className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={taxSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-60"
              >
                {taxSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Đang lưu...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" /> Lưu thuế
                  </>
                )}
              </button>
            </form>
          </div>
        </section>
      )}
    </div>
  );
}
