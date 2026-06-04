"use client";

import { useMemo } from "react";

type PolicyHtmlRendererProps = {
  html: string;
  emptyText?: string;
};

function sanitizePolicyHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/\s(href|src)=["']javascript:[^"']*["']/gi, "");
}

export default function PolicyHtmlRenderer({
  html,
  emptyText = "Chính sách chưa có nội dung.",
}: PolicyHtmlRendererProps) {
  const safeHtml = useMemo(() => sanitizePolicyHtml(html), [html]);

  if (!safeHtml.trim()) {
    return <p className="text-sm text-gray-500">{emptyText}</p>;
  }

  return (
    <div
      className="policy-html max-w-none text-sm leading-7 text-gray-700 [&_a]:font-semibold [&_a]:text-blue-700 [&_a]:underline [&_figcaption]:mt-2 [&_figcaption]:text-center [&_figcaption]:text-xs [&_figcaption]:text-gray-500 [&_figure]:my-5 [&_h1]:mb-4 [&_h1]:mt-6 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-gray-950 [&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-gray-950 [&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-gray-950 [&_img]:max-h-[620px] [&_img]:w-full [&_img]:rounded-md [&_img]:object-contain [&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-3 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-5"
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
}
