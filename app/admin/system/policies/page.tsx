"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, FileText } from "lucide-react";
import { toast } from "sonner";
import { makeHeaders } from "@/app/admin/_lib/fetcher";

type PolicySection = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  allowedText?: string | null;
  deniedText?: string | null;
  content?: string | null;
};

const fetchJSON = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url, { headers: makeHeaders() });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as T;
};

export default function PoliciesPage() {
  const [pageLoading, setPageLoading] = useState(true);
  const [policySections, setPolicySections] = useState<PolicySection[]>([]);
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const policyData = await fetchJSON<{ data: PolicySection[] }>("/api/admin/policies");
        if (ignore) return;
        setPolicySections(policyData.data);
      } catch (error) {
        console.error("Failed to load policies", error);
        toast.error("Không tải được dữ liệu chính sách.");
      } finally {
        if (!ignore) setPageLoading(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, []);

  const updateLoadingMap = (key: string, value: boolean) =>
    setLoadingMap((prev) => ({ ...prev, [key]: value }));

  const updateLocalPolicy = (slug: string, changes: Partial<PolicySection>) => {
    setPolicySections((prev) =>
      prev.map((section) => (section.slug === slug ? { ...section, ...changes } : section)),
    );
  };

  async function handleSavePolicy(slug: string) {
    const policy = policySections.find((section) => section.slug === slug);
    if (!policy) return;

    updateLoadingMap(`policy-${slug}`, true);
    try {
      const res = await fetch(`/api/admin/policies/${slug}`, {
        method: "PUT",
        headers: makeHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          description: policy.description,
          allowedText: policy.allowedText,
          deniedText: policy.deniedText,
          content: policy.content,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success(`Đã lưu ${policy.title}.`);
    } catch (error) {
      console.error("Failed to save policy", error);
      toast.error("Không thể cập nhật chính sách.");
    } finally {
      updateLoadingMap(`policy-${slug}`, false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Chính sách</h1>
        <p className="text-gray-600">Quản lý nội dung hiển thị trên trang Chính sách.</p>
      </header>

      {pageLoading ? (
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Đang tải dữ liệu...
        </div>
      ) : (
        <section className="rounded-2xl border bg-white p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900">Nội dung chính sách</h2>
          </div>
          <p className="text-sm text-gray-500">
            Mỗi mục sẽ hiển thị trên trang Chính sách. Bạn có thể thêm nhiều dòng bằng cách xuống hàng.
          </p>
          <div className="space-y-6">
            {policySections.map((section) => (
              <div key={section.slug} className="rounded-2xl border border-gray-200 p-4 space-y-3">
                <div className="font-semibold text-gray-900">{section.title}</div>
                <textarea
                  placeholder="Mô tả ngắn"
                  value={section.description ?? ""}
                  onChange={(e) => updateLocalPolicy(section.slug, { description: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                />
                <div className="grid gap-4 lg:grid-cols-2">
                  <textarea
                    placeholder="Điều kiện được áp dụng (mỗi dòng một điều kiện)"
                    value={section.allowedText ?? ""}
                    onChange={(e) => updateLocalPolicy(section.slug, { allowedText: e.target.value })}
                    className="rounded-xl border border-gray-300 px-3 py-2 text-sm min-h-[140px]"
                  />
                  <textarea
                    placeholder="Trường hợp không áp dụng"
                    value={section.deniedText ?? ""}
                    onChange={(e) => updateLocalPolicy(section.slug, { deniedText: e.target.value })}
                    className="rounded-xl border border-gray-300 px-3 py-2 text-sm min-h-[140px]"
                  />
                </div>
                <textarea
                  placeholder="Nội dung chung / hướng dẫn thêm"
                  value={section.content ?? ""}
                  onChange={(e) => updateLocalPolicy(section.slug, { content: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm min-h-[120px]"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleSavePolicy(section.slug)}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                    disabled={loadingMap[`policy-${section.slug}`]}
                  >
                    {loadingMap[`policy-${section.slug}`] ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Lưu {section.title}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
