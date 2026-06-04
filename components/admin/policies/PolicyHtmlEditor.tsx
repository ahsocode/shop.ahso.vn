"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code2,
  Eye,
  Italic,
  LinkIcon,
  List,
  ListOrdered,
  Pilcrow,
  Underline,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import PolicyHtmlRenderer from "@/components/policies/PolicyHtmlRenderer";

const MAX_CONTENT_LENGTH = 50000;

type PolicyHtmlEditorProps = {
  value: string;
  onChange: (value: string) => void;
};

type ViewMode = "edit" | "preview" | "html";

function escapeAttribute(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function ToolbarButton({
  children,
  disabled = false,
  label,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 transition-colors hover:border-blue-600 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

export default function PolicyHtmlEditor({ value, onChange }: PolicyHtmlEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("edit");
  const [isLinkPanelOpen, setIsLinkPanelOpen] = useState(false);
  const [linkText, setLinkText] = useState("");
  const [linkHref, setLinkHref] = useState("");

  useEffect(() => {
    if (!editorRef.current || viewMode !== "edit") return;
    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value, viewMode]);

  const emitEditorValue = useCallback(() => {
    const nextValue = editorRef.current?.innerHTML ?? "";
    if (nextValue.length > MAX_CONTENT_LENGTH) {
      toast.warning("Nội dung chính sách tối đa 50000 ký tự.");
    }
    onChange(nextValue.slice(0, MAX_CONTENT_LENGTH));
  }, [onChange]);

  const runCommand = (command: string, commandValue?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    emitEditorValue();
  };

  const insertHtml = (html: string) => {
    editorRef.current?.focus();
    document.execCommand("insertHTML", false, html);
    emitEditorValue();
  };

  const handleToggleLinkPanel = () => {
    const selectedText = window.getSelection()?.toString().trim() ?? "";
    if (selectedText) setLinkText(selectedText);
    setIsLinkPanelOpen((current) => !current);
  };

  const handleCreateLink = () => {
    if (!linkText.trim()) {
      toast.warning("Vui lòng nhập văn bản hiển thị cho liên kết.");
      return;
    }

    if (!linkHref.trim()) {
      toast.warning("Vui lòng nhập URL liên kết.");
      return;
    }

    insertHtml(
      `<a href="${escapeAttribute(linkHref.trim())}" rel="noopener noreferrer">${escapeHtml(linkText.trim())}</a>`,
    );
    setLinkText("");
    setLinkHref("");
    setIsLinkPanelOpen(false);
    toast.success("Đã chèn liên kết vào nội dung.");
  };

  const characterCount = value.length;
  const isOverLimit = characterCount >= MAX_CONTENT_LENGTH;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <ToolbarButton label="Đoạn văn" onClick={() => runCommand("formatBlock", "p")}>
            <Pilcrow className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label="Tiêu đề H1" onClick={() => runCommand("formatBlock", "h1")}>
            <span className="text-xs font-bold">H1</span>
          </ToolbarButton>
          <ToolbarButton label="Tiêu đề H2" onClick={() => runCommand("formatBlock", "h2")}>
            <span className="text-xs font-bold">H2</span>
          </ToolbarButton>
          <ToolbarButton label="Tiêu đề H3" onClick={() => runCommand("formatBlock", "h3")}>
            <span className="text-xs font-bold">H3</span>
          </ToolbarButton>
          <ToolbarButton label="In đậm" onClick={() => runCommand("bold")}>
            <Bold className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label="In nghiêng" onClick={() => runCommand("italic")}>
            <Italic className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label="Gạch chân" onClick={() => runCommand("underline")}>
            <Underline className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label="Danh sách bullet" onClick={() => runCommand("insertUnorderedList")}>
            <List className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label="Danh sách số" onClick={() => runCommand("insertOrderedList")}>
            <ListOrdered className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label="Căn trái" onClick={() => runCommand("justifyLeft")}>
            <AlignLeft className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label="Căn giữa" onClick={() => runCommand("justifyCenter")}>
            <AlignCenter className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label="Căn phải" onClick={() => runCommand("justifyRight")}>
            <AlignRight className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label="Thêm liên kết" onClick={handleToggleLinkPanel}>
            <LinkIcon className="h-4 w-4" />
          </ToolbarButton>
        </div>

        <div className="flex rounded-md border border-gray-300 p-1">
          {(["edit", "preview", "html"] as const).map((mode) => (
            <button
              key={mode}
              className={[
                "inline-flex h-8 items-center gap-1 rounded px-2 text-xs font-semibold transition-colors hover:text-blue-700",
                viewMode === mode ? "bg-blue-600 text-white hover:text-white" : "text-gray-600",
              ].join(" ")}
              onClick={() => setViewMode(mode)}
              type="button"
            >
              {mode === "edit" ? (
                <Pilcrow className="h-3.5 w-3.5" />
              ) : mode === "preview" ? (
                <Eye className="h-3.5 w-3.5" />
              ) : (
                <Code2 className="h-3.5 w-3.5" />
              )}
              {mode === "edit" ? "Soạn" : mode === "preview" ? "Preview" : "HTML"}
            </button>
          ))}
        </div>
      </div>

      {isLinkPanelOpen ? (
        <div className="grid gap-3 rounded-md border border-gray-200 bg-gray-50 p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto]">
          <label className="grid gap-1 text-xs font-semibold text-gray-600">
            Văn bản hiển thị
            <input
              className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm font-normal text-gray-900 outline-none focus:border-blue-600"
              onChange={(event) => setLinkText(event.target.value)}
              placeholder="Xem thêm tại đây"
              type="text"
              value={linkText}
            />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-gray-600">
            URL liên kết
            <input
              className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm font-normal text-gray-900 outline-none focus:border-blue-600"
              onChange={(event) => setLinkHref(event.target.value)}
              placeholder="https://example.com hoặc /lien-he"
              type="text"
              value={linkHref}
            />
          </label>
          <div className="grid content-end">
            <Button className="h-10 px-3 text-xs font-semibold" onClick={handleCreateLink} type="button">
              Chèn liên kết
            </Button>
          </div>
        </div>
      ) : null}

      {viewMode === "edit" ? (
        <div
          ref={editorRef}
          aria-label="Nội dung HTML chính sách"
          className="min-h-80 rounded-md border border-gray-300 bg-white px-4 py-3 text-sm leading-6 text-gray-900 outline-none focus:border-blue-600 [&_a]:cursor-pointer [&_a]:font-semibold [&_a]:text-blue-700 [&_h1]:mt-4 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mt-3 [&_h3]:text-lg [&_h3]:font-semibold [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
          contentEditable
          onInput={emitEditorValue}
          role="textbox"
          suppressContentEditableWarning
        />
      ) : viewMode === "preview" ? (
        <div className="min-h-80 rounded-md border border-gray-300 bg-white px-4 py-3">
          <PolicyHtmlRenderer html={value} />
        </div>
      ) : (
        <textarea
          className="min-h-80 w-full rounded-md border border-gray-300 bg-white px-3 py-2 font-mono text-xs leading-5 outline-none focus:border-blue-600"
          onChange={(event) => onChange(event.target.value.slice(0, MAX_CONTENT_LENGTH))}
          value={value}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
        <span>Dùng định dạng HTML cơ bản: đoạn, H1, H2, H3, danh sách và liên kết.</span>
        <span className={isOverLimit ? "font-semibold text-red-600" : ""}>{characterCount}/{MAX_CONTENT_LENGTH}</span>
      </div>
    </div>
  );
}
