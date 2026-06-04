"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, ChevronRight, FileText, Headphones, Loader2 } from "lucide-react";
import PolicyHtmlRenderer from "@/components/policies/PolicyHtmlRenderer";

type PolicySectionDTO = {
  id: string;
  name: string;
  content: string;
};

export default function PolicyPage() {
  const [policies, setPolicies] = useState<PolicySectionDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [activePolicyId, setActivePolicyId] = useState("");

  const policyNavItems = useMemo(
    () =>
      policies.map((policy) => ({
        ...policy,
        anchorId: `policy-${policy.id}`,
      })),
    [policies],
  );

  useEffect(() => {
    let ignore = false;

    async function loadPolicies() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const res = await fetch("/api/policies");
        if (!res.ok) throw new Error("Không tải được dữ liệu chính sách.");
        const json = (await res.json()) as { data?: PolicySectionDTO[] };
        if (!ignore) setPolicies(Array.isArray(json.data) ? json.data : []);
      } catch (error) {
        console.error("Failed to load policies", error);
        if (!ignore) setErrorMessage("Không tải được chính sách. Vui lòng thử lại sau.");
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    void loadPolicies();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (policyNavItems.length === 0) return;

    setActivePolicyId((current) => current || policyNavItems[0].id);

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        const policyId = visibleEntry?.target.getAttribute("data-policy-id");
        if (policyId) setActivePolicyId(policyId);
      },
      { rootMargin: "-120px 0px -55% 0px", threshold: [0.15, 0.35, 0.6] },
    );

    policyNavItems.forEach((policy) => {
      const element = document.getElementById(policy.anchorId);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [policyNavItems]);

  function handlePolicyNavClick(anchorId: string, policyId: string) {
    setActivePolicyId(policyId);
    document.getElementById(anchorId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-[1600px] px-4 py-12 sm:px-6 lg:px-8 xl:px-10">
          <div className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700">
            <FileText className="h-4 w-4 text-blue-700" />
            Chính sách & Điều khoản
          </div>
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-gray-950 md:text-4xl">
            Chính sách của AHSO
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600 md:text-base">
            Các điều khoản được công bố để khách hàng dễ tra cứu trước khi đặt hàng, yêu cầu báo giá hoặc làm việc với AHSO.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1600px] px-4 py-10 sm:px-6 lg:px-8 xl:px-10">
        {isLoading ? (
          <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-white p-5 text-sm text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Đang tải chính sách...
          </div>
        ) : errorMessage ? (
          <div className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-5 text-sm text-red-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">Không thể hiển thị chính sách</p>
              <p className="mt-1">{errorMessage}</p>
            </div>
          </div>
        ) : policies.length === 0 ? (
          <div className="rounded-md border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-600">
            Chưa có chính sách nào được công bố.
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start 2xl:grid-cols-[420px_minmax(0,1fr)]">
            <aside className="lg:sticky lg:top-24">
              <nav className="rounded-md border border-gray-200 bg-white p-4 2xl:p-5" aria-label="Mục lục chính sách">
                <div className="flex items-center gap-2 text-sm font-bold text-gray-950">
                  <FileText className="h-4 w-4 text-blue-700" />
                  Mục lục
                </div>
                <p className="mt-1 text-xs leading-5 text-gray-500">
                  Chọn một mục để chuyển nhanh đến nội dung chính sách.
                </p>
                <div className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-1 lg:overflow-visible lg:pb-0">
                  {policyNavItems.map((policy, index) => {
                    const isActive = policy.id === activePolicyId;
                    return (
                      <button
                        key={policy.id}
                        className={[
                          "group flex min-w-[280px] items-start gap-2 rounded-md px-3 py-3 text-left text-sm transition-colors lg:min-w-0 lg:w-full",
                          isActive
                            ? "bg-blue-50 font-semibold text-blue-800"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-950",
                        ].join(" ")}
                        onClick={() => handlePolicyNavClick(policy.anchorId, policy.id)}
                        type="button"
                      >
                        <span
                          className={[
                            "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-xs",
                            isActive ? "border-blue-200 bg-white text-blue-800" : "border-gray-200 text-gray-500",
                          ].join(" ")}
                        >
                          {index + 1}
                        </span>
                        <span className="min-w-0 flex-1 whitespace-normal break-words leading-5">{policy.name}</span>
                        <ChevronRight
                          className={[
                            "mt-1 hidden h-4 w-4 shrink-0 transition-transform lg:block",
                            isActive ? "translate-x-0 text-blue-700" : "text-gray-300 group-hover:translate-x-0.5",
                          ].join(" ")}
                        />
                      </button>
                    );
                  })}
                </div>
              </nav>
            </aside>

            <div className="space-y-5">
              {policyNavItems.map((policy) => (
                <article
                  key={policy.id}
                  id={policy.anchorId}
                  data-policy-id={policy.id}
                  className="scroll-mt-28 rounded-md border border-gray-200 bg-white p-5 md:p-6 xl:p-8"
                >
                  <h2 className="text-xl font-bold text-gray-950">{policy.name}</h2>
                  <div className="mt-4">
                    <PolicyHtmlRenderer html={policy.content} />
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="border-t border-gray-200 bg-white">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8 xl:px-10">
          <div>
            <h2 className="text-lg font-bold text-gray-950">Cần hỗ trợ thêm?</h2>
            <p className="mt-1 text-sm text-gray-600">
              Liên hệ AHSO để được giải thích rõ hơn về điều khoản áp dụng.
            </p>
          </div>
          <Link
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600"
            href="/contact"
          >
            <Headphones className="h-4 w-4" />
            Liên hệ AHSO
          </Link>
        </div>
      </section>
    </main>
  );
}
