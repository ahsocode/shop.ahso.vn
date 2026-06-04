"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code2,
  Eye,
  ImageIcon,
  Italic,
  LinkIcon,
  List,
  ListOrdered,
  Loader2,
  Pilcrow,
  Upload,
  Underline,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PolicyHtmlRenderer from "@/components/policies/PolicyHtmlRenderer";

const DEFAULT_MAX_CONTENT_LENGTH = 50000;
const DEFAULT_IMAGE_ENDPOINT = "/api/admin/content-images";

type GalleryAsset = {
  publicId: string;
  secureUrl?: string;
  url?: string;
  width?: number;
  height?: number;
  createdAt?: string;
};

type GalleryResponse = {
  items?: GalleryAsset[];
  nextCursor?: string | null;
};

type HtmlContentEditorProps = {
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
  emptyPreviewText?: string;
  headers?: HeadersInit;
  imageEndpoint?: string;
  maxLength?: number;
};

type ViewMode = "edit" | "preview" | "html";

function escapeAttribute(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function getAssetUrl(asset: GalleryAsset) {
  return asset.secureUrl || asset.url || "";
}

function getAssetLabel(publicId: string) {
  const parts = publicId.split("/");
  return parts[parts.length - 1] || publicId;
}

function normalizeHeaders(headers?: HeadersInit) {
  const nextHeaders = new Headers(headers);
  return Object.fromEntries(nextHeaders.entries());
}

function isErrorResponse(data: GalleryResponse | { error?: string } | null): data is { error?: string } {
  return Boolean(data && "error" in data);
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

export default function HtmlContentEditor({
  ariaLabel = "Nội dung HTML",
  emptyPreviewText,
  headers,
  imageEndpoint = DEFAULT_IMAGE_ENDPOINT,
  maxLength = DEFAULT_MAX_CONTENT_LENGTH,
  onChange,
  value,
}: HtmlContentEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const savedSelectionRef = useRef<Range | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("edit");
  const [isLinkPanelOpen, setIsLinkPanelOpen] = useState(false);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [assets, setAssets] = useState<GalleryAsset[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [linkText, setLinkText] = useState("");
  const [linkHref, setLinkHref] = useState("");
  const [imageAlt, setImageAlt] = useState("");

  useEffect(() => {
    if (!editorRef.current || viewMode !== "edit") return;
    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value, viewMode]);

  const emitEditorValue = useCallback(() => {
    const nextValue = editorRef.current?.innerHTML ?? "";
    if (nextValue.length > maxLength) {
      toast.warning(`Nội dung tối đa ${maxLength} ký tự.`);
    }
    onChange(nextValue.slice(0, maxLength));
  }, [maxLength, onChange]);

  const saveSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (editorRef.current?.contains(range.commonAncestorContainer)) {
      savedSelectionRef.current = range.cloneRange();
    }
  };

  const restoreSelection = () => {
    const selection = window.getSelection();
    const range = savedSelectionRef.current;
    if (!selection || !range) return;
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const runCommand = (command: string, commandValue?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    emitEditorValue();
  };

  const insertHtml = (html: string) => {
    editorRef.current?.focus();
    restoreSelection();
    document.execCommand("insertHTML", false, html);
    emitEditorValue();
  };

  const handleToggleLinkPanel = () => {
    saveSelection();
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

  const openImageDialog = async () => {
    saveSelection();
    setIsImageDialogOpen(true);
    if (!assets.length) {
      await loadAssets(null, true);
    }
  };

  const loadAssets = async (cursor: string | null, replace = false) => {
    setIsLoadingAssets(true);
    try {
      const params = new URLSearchParams({ maxResults: "30" });
      if (cursor) params.set("nextCursor", cursor);
      const res = await fetch(`${imageEndpoint}?${params.toString()}`, {
        headers: normalizeHeaders(headers),
      });
      const data = (await res.json().catch(() => null)) as GalleryResponse | { error?: string } | null;
      if (!res.ok || !data || isErrorResponse(data)) {
        throw new Error(isErrorResponse(data) ? data.error || "Không tải được thư viện ảnh." : "Không tải được thư viện ảnh.");
      }
      setAssets((current) => (replace ? data.items ?? [] : [...current, ...(data.items ?? [])]));
      setNextCursor(data.nextCursor ?? null);
    } catch (error) {
      console.error("Load editor image library failed:", error);
      toast.error(error instanceof Error ? error.message : "Không tải được thư viện ảnh.");
    } finally {
      setIsLoadingAssets(false);
    }
  };

  const insertImage = (asset: GalleryAsset) => {
    const url = getAssetUrl(asset);
    if (!url) {
      toast.warning("Ảnh không có URL hợp lệ.");
      return;
    }

    const alt = imageAlt.trim() || getAssetLabel(asset.publicId);
    insertHtml(
      `<figure><img src="${escapeAttribute(url)}" alt="${escapeAttribute(alt)}" loading="lazy" /><figcaption>${escapeHtml(
        alt,
      )}</figcaption></figure><p><br></p>`,
    );
    setImageAlt("");
    setIsImageDialogOpen(false);
    toast.success("Đã chèn ảnh vào nội dung.");
  };

  const uploadImages = async (files: FileList | null) => {
    const imageFiles = Array.from(files ?? []).filter((file) => file.type.startsWith("image/"));
    if (!imageFiles.length) return;

    setIsUploading(true);
    const toastId = toast.loading(`Đang upload ${imageFiles.length} ảnh...`);
    try {
      const formData = new FormData();
      imageFiles.forEach((file) => formData.append("files", file));
      const res = await fetch(imageEndpoint, {
        method: "POST",
        headers: normalizeHeaders(headers),
        body: formData,
      });
      const data = (await res.json().catch(() => null)) as GalleryResponse | { error?: string } | null;
      if (!res.ok || !data || isErrorResponse(data)) {
        throw new Error(isErrorResponse(data) ? data.error || "Upload ảnh thất bại." : "Upload ảnh thất bại.");
      }

      const uploaded = data.items ?? [];
      setAssets((current) => [...uploaded, ...current]);
      uploaded.forEach((asset) => insertImage(asset));
      toast.success(`Đã upload và chèn ${uploaded.length} ảnh.`, { id: toastId });
    } catch (error) {
      console.error("Upload editor image failed:", error);
      toast.error(error instanceof Error ? error.message : "Upload ảnh thất bại.", { id: toastId });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const characterCount = value.length;
  const isOverLimit = characterCount >= maxLength;

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
          <ToolbarButton disabled={isUploading} label="Chèn ảnh" onClick={openImageDialog}>
            <ImageIcon className="h-4 w-4" />
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
          aria-label={ariaLabel}
          className="min-h-80 rounded-md border border-gray-300 bg-white px-4 py-3 text-sm leading-6 text-gray-900 outline-none focus:border-blue-600 [&_a]:cursor-pointer [&_a]:font-semibold [&_a]:text-blue-700 [&_figcaption]:mt-2 [&_figcaption]:text-center [&_figcaption]:text-xs [&_figcaption]:text-gray-500 [&_figure]:my-4 [&_figure]:rounded-md [&_figure]:border [&_figure]:border-gray-200 [&_figure]:bg-gray-50 [&_figure]:p-2 [&_h1]:mt-4 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mt-3 [&_h3]:text-lg [&_h3]:font-semibold [&_img]:max-h-[520px] [&_img]:w-full [&_img]:rounded-md [&_img]:object-contain [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
          contentEditable
          onBlur={saveSelection}
          onInput={emitEditorValue}
          onKeyUp={saveSelection}
          onMouseUp={saveSelection}
          role="textbox"
          suppressContentEditableWarning
        />
      ) : viewMode === "preview" ? (
        <div className="min-h-80 rounded-md border border-gray-300 bg-white px-4 py-3">
          <PolicyHtmlRenderer emptyText={emptyPreviewText} html={value} />
        </div>
      ) : (
        <textarea
          className="min-h-80 w-full rounded-md border border-gray-300 bg-white px-3 py-2 font-mono text-xs leading-5 outline-none focus:border-blue-600"
          onChange={(event) => onChange(event.target.value.slice(0, maxLength))}
          value={value}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
        <span>Dùng định dạng HTML cơ bản: đoạn, tiêu đề, danh sách, liên kết và ảnh.</span>
        <span className={isOverLimit ? "font-semibold text-red-600" : ""}>{characterCount}/{maxLength}</span>
      </div>

      <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Chèn ảnh vào nội dung</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <label className="grid min-w-60 flex-1 gap-1 text-xs font-semibold text-gray-600">
                Mô tả ảnh
                <input
                  className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm font-normal text-gray-900 outline-none focus:border-blue-600"
                  onChange={(event) => setImageAlt(event.target.value)}
                  placeholder="VD: Sơ đồ giải pháp quản lý kho"
                  type="text"
                  value={imageAlt}
                />
              </label>
              <Button
                className="h-10 gap-2"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Upload ảnh
              </Button>
              <input
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                multiple
                onChange={(event) => uploadImages(event.target.files)}
                type="file"
              />
            </div>

            <div className="min-h-80 rounded-md border border-gray-200 bg-gray-50 p-3">
              {isLoadingAssets && assets.length === 0 ? (
                <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang tải thư viện ảnh...
                </div>
              ) : assets.length === 0 ? (
                <div className="flex min-h-64 items-center justify-center text-sm text-gray-500">
                  Chưa có ảnh trong thư viện. Hãy upload ảnh mới để chèn vào bài viết.
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {assets.map((asset) => {
                    const url = getAssetUrl(asset);
                    return (
                      <button
                        key={asset.publicId}
                        className="overflow-hidden rounded-md border border-gray-200 bg-white text-left transition-colors hover:border-blue-500"
                        onClick={() => insertImage(asset)}
                        type="button"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img alt={asset.publicId} className="h-32 w-full bg-gray-100 object-cover" src={url} />
                        <div className="space-y-1 px-2 py-2">
                          <p className="line-clamp-1 text-xs font-semibold text-gray-700">{getAssetLabel(asset.publicId)}</p>
                          <p className="text-[11px] text-gray-500">
                            {asset.width && asset.height ? `${asset.width} x ${asset.height}` : "Cloudinary"}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            {nextCursor ? (
              <Button
                disabled={isLoadingAssets}
                onClick={() => loadAssets(nextCursor)}
                type="button"
                variant="outline"
              >
                {isLoadingAssets ? "Đang tải..." : "Tải thêm ảnh"}
              </Button>
            ) : null}
            <Button onClick={() => setIsImageDialogOpen(false)} type="button" variant="outline">
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
