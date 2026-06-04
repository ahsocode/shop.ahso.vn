"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import HtmlContentEditor from "@/components/admin/HtmlContentEditor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { makeHeaders } from "@/app/admin/_lib/fetcher";
import { confirmToast } from "@/lib/confirm-toast";

type PolicySection = {
  id: string;
  name: string;
  content: string;
};

type PolicyFormValue = {
  id?: string;
  name: string;
  content: string;
};

const EMPTY_FORM: PolicyFormValue = {
  name: "",
  content: "",
};

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: makeHeaders() });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as T;
}

function normalizeFormValue(formValue: PolicyFormValue) {
  return {
    name: formValue.name.trim(),
    content: formValue.content.trim(),
  };
}

export default function PoliciesPage() {
  const [pageLoading, setPageLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [policies, setPolicies] = useState<PolicySection[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formValue, setFormValue] = useState<PolicyFormValue>(EMPTY_FORM);

  const selectedPolicy = useMemo(
    () => policies.find((policy) => policy.id === selectedId) ?? null,
    [policies, selectedId],
  );

  const isEditMode = Boolean(formValue.id);

  useEffect(() => {
    let ignore = false;

    async function loadPolicies() {
      try {
        const policyData = await fetchJSON<{ data: PolicySection[] }>("/api/admin/policies");
        if (ignore) return;

        setPolicies(policyData.data);
        const firstPolicy = policyData.data[0];
        if (firstPolicy) {
          setSelectedId(firstPolicy.id);
          setFormValue({
            id: firstPolicy.id,
            name: firstPolicy.name,
            content: firstPolicy.content ?? "",
          });
        }
      } catch (error) {
        console.error("Failed to load policies", error);
        toast.error("Không tải được dữ liệu chính sách.");
      } finally {
        if (!ignore) setPageLoading(false);
      }
    }

    void loadPolicies();

    return () => {
      ignore = true;
    };
  }, []);

  function selectPolicy(policy: PolicySection) {
    setSelectedId(policy.id);
    setFormValue({
      id: policy.id,
      name: policy.name,
      content: policy.content ?? "",
    });
  }

  function startCreatePolicy() {
    setSelectedId(null);
    setFormValue(EMPTY_FORM);
    toast.info("Đang tạo chính sách mới.");
  }

  async function handleSavePolicy() {
    const payload = normalizeFormValue(formValue);

    if (!payload.name) {
      toast.warning("Vui lòng nhập tên chính sách.");
      return;
    }

    const confirmed = await confirmToast(isEditMode ? "Lưu thay đổi chính sách?" : "Tạo chính sách mới?", {
      description: isEditMode
        ? `Các thay đổi của "${payload.name}" sẽ được cập nhật.`
        : `Chính sách "${payload.name}" sẽ được tạo mới.`,
      confirmText: isEditMode ? "Lưu thay đổi" : "Tạo chính sách",
      cancelText: "Hủy",
      variant: "modal",
    });

    if (!confirmed) return;

    setIsSaving(true);
    const toastId = toast.loading(isEditMode ? "Đang lưu chính sách..." : "Đang tạo chính sách...");

    try {
      const res = await fetch(isEditMode ? `/api/admin/policies/${formValue.id}` : "/api/admin/policies", {
        method: isEditMode ? "PUT" : "POST",
        headers: makeHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as { data: PolicySection };
      const savedPolicy = json.data;

      setPolicies((current) => {
        if (isEditMode) {
          return current.map((policy) => (policy.id === savedPolicy.id ? savedPolicy : policy));
        }
        return [...current, savedPolicy].sort((a, b) => a.name.localeCompare(b.name, "vi"));
      });
      setSelectedId(savedPolicy.id);
      setFormValue({
        id: savedPolicy.id,
        name: savedPolicy.name,
        content: savedPolicy.content ?? "",
      });
      toast.success(isEditMode ? "Đã cập nhật chính sách." : "Đã tạo chính sách.", { id: toastId });
    } catch (error) {
      console.error("Failed to save policy", error);
      toast.error("Không thể lưu chính sách.", { id: toastId });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeletePolicy() {
    if (!formValue.id) {
      toast.warning("Vui lòng chọn chính sách cần xóa.");
      return;
    }

    const policyName = formValue.name.trim() || "chính sách này";
    const confirmed = await confirmToast(`Xóa ${policyName}?`, {
      description: "Nội dung chính sách sẽ bị xóa khỏi trang hiển thị. Hành động này không thể hoàn tác.",
      confirmText: "Xóa chính sách",
      cancelText: "Hủy",
      variant: "modal",
    });

    if (!confirmed) return;

    setIsDeleting(true);
    const toastId = toast.loading("Đang xóa chính sách...");

    try {
      const res = await fetch(`/api/admin/policies/${formValue.id}`, {
        method: "DELETE",
        headers: makeHeaders(),
      });
      if (!res.ok) throw new Error(await res.text());

      setPolicies((current) => {
        const nextPolicies = current.filter((policy) => policy.id !== formValue.id);
        const nextSelected = nextPolicies[0] ?? null;
        setSelectedId(nextSelected?.id ?? null);
        setFormValue(
          nextSelected
            ? {
                id: nextSelected.id,
                name: nextSelected.name,
                content: nextSelected.content ?? "",
              }
            : EMPTY_FORM,
        );
        return nextPolicies;
      });
      toast.success("Đã xóa chính sách.", { id: toastId });
    } catch (error) {
      console.error("Failed to delete policy", error);
      toast.error("Không thể xóa chính sách.", { id: toastId });
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chính sách</h1>
          <p className="mt-1 text-sm text-gray-600">Quản lý tên và nội dung HTML hiển thị trên trang chính sách.</p>
        </div>
        <Button onClick={startCreatePolicy} type="button">
          <Plus className="h-4 w-4" />
          Tạo chính sách
        </Button>
      </header>

      {pageLoading ? (
        <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="h-64 animate-pulse rounded-md border border-gray-200 bg-gray-100" />
          <div className="h-96 animate-pulse rounded-md border border-gray-200 bg-gray-100" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <Card className="rounded-md shadow-none">
            <CardHeader className="p-4">
              <CardTitle className="text-base">Danh sách chính sách</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-4 pt-0">
              {policies.length === 0 ? (
                <div className="rounded-md border border-dashed border-gray-300 p-4 text-sm text-gray-600">
                  Chưa có chính sách nào. Chọn “Tạo chính sách” để thêm nội dung đầu tiên.
                </div>
              ) : (
                policies.map((policy) => (
                  <button
                    className={[
                      "flex w-full items-start gap-3 rounded-md border px-3 py-3 text-left transition-colors",
                      policy.id === selectedId
                        ? "border-blue-600 bg-blue-50 text-blue-950"
                        : "border-gray-200 bg-white text-gray-800 hover:border-blue-300",
                    ].join(" ")}
                    key={policy.id}
                    onClick={() => selectPolicy(policy)}
                    type="button"
                  >
                    <FileText className="mt-0.5 h-4 w-4 shrink-0" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{policy.name}</span>
                      <span className="mt-1 block text-xs text-gray-500">
                        {policy.content?.trim() ? "Đã có nội dung HTML" : "Chưa có nội dung"}
                      </span>
                    </span>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="rounded-md shadow-none">
            <CardHeader className="border-b border-gray-200 p-4">
              <CardTitle className="text-base">
                {isEditMode ? `Chỉnh sửa: ${selectedPolicy?.name ?? formValue.name}` : "Tạo chính sách mới"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 p-4">
              <div className="grid gap-2">
                <Label htmlFor="policy-name">Tên chính sách</Label>
                <Input
                  id="policy-name"
                  onChange={(event) => setFormValue((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Ví dụ: Chính sách bảo hành"
                  value={formValue.name}
                />
              </div>

              <div className="grid gap-2">
                <Label>Nội dung HTML</Label>
                <HtmlContentEditor
                  ariaLabel="Nội dung HTML chính sách"
                  emptyPreviewText="Chính sách chưa có nội dung."
                  headers={makeHeaders()}
                  onChange={(content) => setFormValue((current) => ({ ...current, content }))}
                  value={formValue.content}
                />
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-gray-200 pt-4 sm:flex-row sm:justify-between">
                {isEditMode ? (
                  <Button
                    className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                    disabled={isSaving || isDeleting}
                    onClick={() => void handleDeletePolicy()}
                    type="button"
                    variant="outline"
                  >
                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    {isDeleting ? "Đang xóa..." : "Xóa chính sách"}
                  </Button>
                ) : (
                  <span />
                )}
                <Button disabled={isSaving || isDeleting} onClick={() => void handleSavePolicy()} type="button">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {isSaving ? "Đang lưu..." : isEditMode ? "Lưu thay đổi" : "Tạo chính sách"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
