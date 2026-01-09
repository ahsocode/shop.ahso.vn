"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { AlertTriangle, FileSpreadsheet } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ImageCropDialog } from "@/components/image/image-crop-dialog";
import { getJSON, postJSON, makeHeaders, patchJSON } from "../../_lib/fetcher";
import { slugify } from "@/lib/slug";
import ProductsTabs from "../_components/ProductsTabs";

type Row = {
  id: string;
  name: string;
  sku: string;
  slug: string;
  price: string;
  listPrice?: string | null;
  costPrice?: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  brand?: { id: string; name: string } | null;
  type?: { id: string; name: string } | null;
  supplier?: { id: string; name: string } | null;
  supplierSku?: string | null;
  requiresQuote?: boolean | null;
  quoteNote?: string | null;
  coverImage?: string | null;
  createdAt?: string;
  updatedAt?: string;
  currency?: string | null;
  stockOnHand?: number | null;
  stockReserved?: number | null;
  reorderLevel?: number | null;
  reorderQty?: number | null;
  minOrderQty?: number | null;
  stepQty?: number | null;
  taxRate?: string | null;
  taxIncluded?: boolean | null;
};

type ConfirmAction =
  | { type: "bulk-update" }
  | { type: "bulk-delete" }
  | { type: "row-delete"; row: Row };

type ListResp<T> = {
  data: T[];
  meta: { total: number; page: number; pageSize: number };
};

type Option = { id: string; name: string; slug?: string; categoryId?: string };

// Thông số kỹ thuật có sẵn trong hệ thống
type SpecDefOption = {
  id: string;
  name: string;
  slug: string;
};

type GalleryAsset = {
  publicId: string;
  secureUrl: string;
  width: number;
  height: number;
  bytes: number;
  createdAt: string;
};

type GalleryUploadItem = {
  file: File;
  preview: string;
};

// Dòng ảnh gallery
type ImageRow = {
  id: number;
  url: string;
  alt: string;
  sortOrder: string; // nhập string, khi gửi convert sang number
};

type ImportIntent =
  | { mode: "pick" }
  | { mode: "drop"; file: File };

type ProductDraft = {
  tempId: string;
  sku: string;
  name: string;
  slug?: string;
  descriptionShort?: string;
  description?: string;
  primaryCategory?: string | null;
  price?: number | null;
  listPrice?: number | null;
  costPrice?: number | null;
  stockOnHand?: number | null;
  brandSlug?: string | null;
  typeSlug?: string | null;
  supplierCode?: string | null;
  supplierId?: string | null;
  coverImage?: string | null;
  galleryImages?: string[];
  specs?: Array<{ key: string; value: string; unit?: string }>;
  currency?: string | null;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  issues: string[];
  mode: "create" | "update";
  changeStatus?: "create" | "update" | "duplicate";
  missing: {
    brand?: string;
    type?: string;
    supplier?: string;
    categories?: string[];
  };
};

type BulkImageItem = {
  file: File;
  fileName: string;
  preview: string;
};

type BulkImageState = {
  files: BulkImageItem[];
  uploading: boolean;
  cover:
    | { source: "upload"; index: number }
    | { source: "library"; url: string }
    | null;
  coverMode: "missing" | "overwrite";
};

const specsToText = (specs?: Array<{ key: string; value: string; unit?: string }>) =>
  (specs ?? [])
    .map((spec) => `${spec.key}: ${spec.value}`)
    .join("\n");

const textToSpecs = (value: string): Array<{ key: string; value: string; unit?: string }> => {
  return value
    .split(/(?:\r?\n|\|)/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const idx = line.indexOf(":");
      if (idx === -1) return null;
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim();
      if (!key || !val) return null;
      return { key, value: val };
    })
    .filter((item): item is { key: string; value: string } => Boolean(item));
};

type DraftUpdateOptions = {
  clearMissing?: Array<keyof ProductDraft["missing"]>;
  clearIssueKeywords?: string[];
};

const cleanupRules: Partial<Record<keyof ProductDraft, DraftUpdateOptions>> = {
  sku: { clearIssueKeywords: ["sku"] },
  name: { clearIssueKeywords: ["tên", "ten"] },
  primaryCategory: { clearMissing: ["categories"] },
  brandSlug: { clearMissing: ["brand"] },
  typeSlug: { clearMissing: ["type"], clearIssueKeywords: ["loại", "loai"] },
  supplierCode: { clearMissing: ["supplier"] },
  supplierId: { clearMissing: ["supplier"] },
};

const applyDraftPatch = (
  row: ProductDraft,
  patch: Partial<ProductDraft>,
  options?: DraftUpdateOptions,
): ProductDraft => {
  let next: ProductDraft = { ...row, ...patch };
  if (options?.clearMissing?.length) {
    const missingCopy = { ...next.missing };
    let changed = false;
    for (const key of options.clearMissing) {
      if (key === "categories") {
        if (missingCopy.categories) {
          delete missingCopy.categories;
          changed = true;
        }
      } else if (missingCopy[key]) {
        delete missingCopy[key];
        changed = true;
      }
    }
    if (changed) {
      next = { ...next, missing: missingCopy };
    }
  }
  if (options?.clearIssueKeywords?.length) {
    const keywords = options.clearIssueKeywords.map((k) => k.toLowerCase());
    const filtered = next.issues.filter(
      (issue) => !keywords.some((keyword) => issue.toLowerCase().includes(keyword)),
    );
    if (filtered.length !== next.issues.length) {
      next = { ...next, issues: filtered };
    }
  }
  return next;
};

const formatShortDate = (iso?: string) =>
  iso
    ? new Intl.DateTimeFormat("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      }).format(new Date(iso))
    : "—";

const formatCurrency = (value?: string | number, currency = "VND") => {
  const num = typeof value === "string" ? Number(value) : value ?? 0;
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(num);
};

const toNumberOrNull = (value?: string | number | null) => {
  if (value === null || value === undefined) return null;
  const num = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(num) ? num : null;
};

const DEFAULT_FORM = {
  name: "",
  sku: "",
  slug: "",
  typeId: "",
  brandId: "",
  supplierId: "",
  supplierSku: "",
  price: "",
  listPrice: "",
  costPrice: "",
  currency: "VND",
  requiresQuote: false,
  quoteNote: "",
  coverImage: "",
  status: "DRAFT" as "DRAFT" | "PUBLISHED" | "ARCHIVED",
  description: "",
  taxRate: "10",
  taxIncluded: true,
  stockOnHand: "",
  reorderLevel: "",
  minOrderQty: "",
};

type FormState = typeof DEFAULT_FORM;
const getAssetLabel = (publicId: string) => {
  const parts = publicId.split("/");
  return parts[parts.length - 1] || publicId;
};

export default function AdminProductListPage() {
  const pageSize = 50;
  const [keyword, setKeyword] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [reloadToken, setReloadToken] = useState(0);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [bulkSupplier, setBulkSupplier] = useState("");
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkQuote, setBulkQuote] = useState("");
  const [bulkType, setBulkType] = useState("");
  const [bulkImage, setBulkImage] = useState<BulkImageState>({
    files: [],
    uploading: false,
    cover: null,
    coverMode: "missing",
  });
  const [bulkLibrarySelection, setBulkLibrarySelection] = useState<string[]>([]);
  const [bulkLibraryApplying, setBulkLibraryApplying] = useState(false);
  const [bulkImageModalOpen, setBulkImageModalOpen] = useState(false);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [rowDeletingId, setRowDeletingId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  const [types, setTypes] = useState<Option[]>([]);
  const [brands, setBrands] = useState<Option[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [suppliers, setSuppliers] = useState<Option[]>([]);
  const [, setSpecDefs] = useState<SpecDefOption[]>([]); // ⬅️ danh sách spec có sẵn

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [loadingList, setLoadingList] = useState(false);

  // bảng ảnh gallery
  const [imageRows, setImageRows] = useState<ImageRow[]>([
    { id: 1, url: "", alt: "", sortOrder: "" },
  ]);
  const selectAllRef = useRef<HTMLInputElement | null>(null);
  const [galleryCropOpen, setGalleryCropOpen] = useState(false);
  const [galleryCropSource, setGalleryCropSource] = useState<{
    url: string;
    fileName: string;
    revokeOnClose: boolean;
  } | null>(null);
  const [galleryTargetId, setGalleryTargetId] = useState<number | null>(null);
  const [, setGalleryUploadingId] = useState<number | null>(null);
  const [coverImageId, setCoverImageId] = useState<number | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryItems, setLibraryItems] = useState<
    { publicId: string; secureUrl: string; width: number; height: number; bytes: number; createdAt: string }[]
  >([]);
  const [libraryNextCursor, setLibraryNextCursor] = useState<string | null>(null);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [libraryMode, setLibraryMode] = useState<"single" | "bulk">("single");
  const [libraryTypeId, setLibraryTypeId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<ProductDraft[]>([]);
  const [selectedDraftIds, setSelectedDraftIds] = useState<string[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importSelection, setImportSelection] = useState<"all" | "selected">("all");
  const [importProgress, setImportProgress] = useState<{
    step: "commit" | "upload_images";
    current: number;
    total: number;
  } | null>(null);
  const [importIntent, setImportIntent] = useState<ImportIntent | null>(null);
  const [importConfirmOpen, setImportConfirmOpen] = useState(false);
  const [defaultBrand, setDefaultBrand] = useState("");
  const [defaultType, setDefaultType] = useState("");
  const [defaultSupplier, setDefaultSupplier] = useState("");
  const bulkFileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [rowUpdatingTypeId, setRowUpdatingTypeId] = useState<string | null>(null);
  const [filterBrand, setFilterBrand] = useState("");
  const [filterType, setFilterType] = useState("");
  const [sortKey, setSortKey] = useState("updatedAt_desc");
  const [galleryTypeId] = useState<string | null>(null);
  const [, setGalleryAssets] = useState<GalleryAsset[]>([]);
  const [, setGalleryNextCursor] = useState<string | null>(null);
  const [, setGalleryLoading] = useState(false);
  const [, setGalleryError] = useState<string | null>(null);
  const [galleryUploadItems, setGalleryUploadItems] = useState<GalleryUploadItem[]>([]);
  const [galleryUploadSku, setGalleryUploadSku] = useState("");
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [, setGalleryUploadProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [gallerySelected, setGallerySelected] = useState<string[]>([]);
  const [galleryConfirmAction, setGalleryConfirmAction] = useState<
    null | { type: "upload" | "delete" }
  >(null);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const importableDrafts = drafts.filter(
    (draft) => (draft.changeStatus ?? draft.mode) !== "duplicate",
  );
  const rowsToImport =
    importSelection === "selected"
      ? drafts.filter(
          (draft) =>
            (draft.changeStatus ?? draft.mode) !== "duplicate" &&
            selectedDraftIds.includes(draft.tempId),
        )
      : importableDrafts;

  const selectedGalleryType = galleryTypeId
    ? types.find((type) => type.id === galleryTypeId) ?? null
    : null;
  const selectedGalleryCategory = selectedGalleryType?.categoryId
    ? categories.find((cat) => cat.id === selectedGalleryType.categoryId) ?? null
    : null;
  const galleryFolderPath = selectedGalleryType
    ? `categories/${slugify(selectedGalleryCategory?.slug ?? selectedGalleryCategory?.name ?? "uncategorized")}/` +
      `${slugify(selectedGalleryType.slug ?? selectedGalleryType.name)}/gallery`
    : "";

  useEffect(() => {
    setSelectedDraftIds((prev) =>
      prev.filter((id) =>
        drafts.some(
          (d) => d.tempId === id && (d.changeStatus ?? d.mode) !== "duplicate",
        ),
      ),
    );
  }, [drafts]);

  const MAX_SELECTION = 50;
  const triggerReload = () => setReloadToken((token) => token + 1);

  const ensureUploadPrerequisites = () => {
    if (!form.typeId) {
      toast.error("Vui lòng chọn loại sản phẩm trước khi tải ảnh");
      return false;
    }
    if (!form.sku.trim()) {
      toast.error("Vui lòng nhập SKU trước khi tải ảnh");
      return false;
    }
    return true;
  };

  const uploadTempImage = async (
    file: File,
    kind: "cover" | "gallery",
    sequence?: number,
  ) => {
    if (!ensureUploadPrerequisites()) {
      throw new Error("Thiếu thông tin sản phẩm");
    }
    const fd = new FormData();
    fd.append("file", file);
    fd.append("typeId", form.typeId);
    fd.append("sku", form.sku.trim());
    fd.append("kind", kind);
    if (sequence !== undefined) {
      fd.append("sequence", String(sequence));
    }
    const res = await fetch("/api/admin/products/upload-temp", {
      method: "POST",
      headers: makeHeaders(),
      body: fd,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(getErrorMessage(data, "Không thể tải ảnh"));
    }
    return (data?.data?.url as string) ?? "";
  };

  const fetchLibrary = async (
    cursor?: string,
    options?: { mode?: "single" | "bulk"; typeId?: string | null },
  ) => {
    const targetTypeId = options?.typeId ?? form.typeId ?? null;
    const mode = options?.mode ?? "single";
    if (!targetTypeId) {
      toast.error("Vui lòng chọn loại sản phẩm trước khi mở thư viện");
      return;
    }
    setLibraryMode(mode);
    setLibraryTypeId(targetTypeId);
    setLibraryLoading(true);
    setLibraryError(null);
    try {
      const params = new URLSearchParams({ typeId: targetTypeId });
      if (cursor) params.set("nextCursor", cursor);
      const res = await fetch(`/api/admin/products/gallery?${params.toString()}`, {
        method: "GET",
        headers: makeHeaders(),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(getErrorMessage(data, "Không thể tải thư viện ảnh"));
      }
      const items = (data?.items ??
        []) as { publicId: string; secureUrl: string; width: number; height: number; bytes: number; createdAt: string }[];
      setLibraryItems((prev) => (cursor ? [...prev, ...items] : items));
      setLibraryNextCursor((data?.nextCursor as string | null) ?? null);
      setLibraryOpen(true);
    } catch (error) {
      const message = extractErrorMessage(error);
      setLibraryError(message);
      toast.error(message);
    } finally {
      setLibraryLoading(false);
    }
  };

  const addImageFromLibrary = (asset: {
    publicId: string;
    secureUrl: string;
    width: number;
    height: number;
    bytes: number;
    createdAt: string;
  }) => {
    let createdId: number | null = null;
    setImageRows((prev) => {
      if (prev.some((row) => row.url === asset.secureUrl)) return prev;
      const nextId = prev.length ? prev[prev.length - 1].id + 1 : 1;
      const nextSort = prev.length ? prev.length + 1 : 1;
      createdId = nextId;
      return [
        ...prev,
        { id: nextId, url: asset.secureUrl, alt: "", sortOrder: String(nextSort) },
      ];
    });
    if (coverImageId === null && createdId !== null) {
      setCoverImageId(createdId);
    }
    setLibraryOpen(false);
    toast.success("Đã thêm ảnh từ thư viện");
  };

  const handleBulkFile = async (file: File) => {
    // Đảm bảo đóng modal xác nhận nếu vẫn đang mở
    setImportConfirmOpen(false);
    setImportIntent(null);

    if (!defaultBrand || !defaultType) {
      toast.error("Vui lòng chọn thương hiệu và loại mặc định trước khi tải file.");
      return;
    }
    setPreviewLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (defaultBrand) fd.append("defaultBrand", defaultBrand);
      if (defaultType) fd.append("defaultType", defaultType);
      if (defaultSupplier) fd.append("defaultSupplierId", defaultSupplier);
      const res = await fetch("/api/admin/products/bulk-import?mode=preview", {
        method: "POST",
        headers: makeHeaders(),
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Không thể đọc file sản phẩm");
        return;
      }
      const rows = (json.rows as ProductDraft[]) ?? [];
      setDrafts(rows);
      setSelectedDraftIds([]);
      toast.success(`Đã phân tích ${rows.length} dòng sản phẩm`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể xử lý file");
    } finally {
      setPreviewLoading(false);
    }
  };

  const updateDraft = (
    tempId: string,
    patch: Partial<ProductDraft>,
    options?: DraftUpdateOptions,
  ) => {
    setDrafts((prev) =>
      prev.map((row) => (row.tempId === tempId ? applyDraftPatch(row, patch, options) : row)),
    );
  };

  const handleApplyBatch = (field: "brandSlug" | "typeSlug" | "supplierCode" | "supplierId", value?: string) => {
    setDrafts((prev) =>
      prev.map((row) =>
        selectedDraftIds.includes(row.tempId)
          ? applyDraftPatch(
              row,
              { [field]: value || undefined } as Partial<ProductDraft>,
              cleanupRules[field],
            )
          : row,
      ),
    );
  };

  const handleRemoveDraft = (tempId: string) => {
    setDrafts((prev) => prev.filter((row) => row.tempId !== tempId));
    setSelectedDraftIds((prev) => prev.filter((id) => id !== tempId));
  };

  const handleRemoveSelected = () => {
    if (!selectedDraftIds.length) return;
    setDrafts((prev) => prev.filter((row) => !selectedDraftIds.includes(row.tempId)));
    setSelectedDraftIds([]);
  };

  const bulkImageInputRef = useRef<HTMLInputElement | null>(null);
  const releaseBulkPreviews = (urls: string[]) => {
    urls.forEach((url) => URL.revokeObjectURL(url));
  };

  useEffect(() => {
    return () => {
      releaseBulkPreviews(bulkImage.files.map((item) => item.preview));
    };
  }, [bulkImage.files]);

  const handleBulkImageButtonClick = () => {
    setBulkImageModalOpen(true);
  };

  const requestImportConfirm = (intent: ImportIntent) => {
    setImportIntent(intent);
    setImportConfirmOpen(true);
  };

  const handleConfirmImport = () => {
    if (!importIntent) return;
    if (!defaultBrand || !defaultType) {
      toast.error("Vui lòng chọn thương hiệu và loại mặc định trước khi tải file.");
      setImportConfirmOpen(false);
      setImportIntent(null);
      return;
    }

    if (importIntent.mode === "pick") {
      setImportConfirmOpen(false);
      setTimeout(() => bulkFileInputRef.current?.click(), 0);
      return;
    }

    if (importIntent.mode === "drop") {
      const file = importIntent.file;
      setImportConfirmOpen(false);
      setImportIntent(null);
      handleBulkFile(file);
    }
  };

  const handleCancelImportConfirm = () => {
    setImportConfirmOpen(false);
    setImportIntent(null);
  };

  const handleBulkImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const nextFiles = files.map((file) => ({
      file,
      fileName: file.name,
      preview: URL.createObjectURL(file),
    }));
    setBulkImage((prev) => ({
      ...prev,
      files: [...prev.files, ...nextFiles],
    }));
    if (bulkImageInputRef.current) bulkImageInputRef.current.value = "";
  };

  const clearBulkImage = () => {
    releaseBulkPreviews(bulkImage.files.map((item) => item.preview));
    if (bulkImageInputRef.current) bulkImageInputRef.current.value = "";
    setBulkImage((prev) => ({
      ...prev,
      files: [],
      cover: prev.cover?.source === "upload" ? null : prev.cover,
      coverMode: "missing",
      uploading: false,
    }));
  };

  const removeBulkImageAt = (index: number) => {
    setBulkImage((prev) => {
      const target = prev.files[index];
      if (target) URL.revokeObjectURL(target.preview);
      const nextFiles = prev.files.filter((_, idx) => idx !== index);
      let nextCover = prev.cover;
      if (prev.cover?.source === "upload") {
        if (prev.cover.index === index) {
          nextCover = null;
        } else if (prev.cover.index > index) {
          nextCover = { source: "upload", index: prev.cover.index - 1 };
        }
      }
      return { ...prev, files: nextFiles, cover: nextCover };
    });
  };

  const removeBulkLibraryImage = (url: string) => {
    setBulkLibrarySelection((prev) => prev.filter((item) => item !== url));
    setBulkImage((prev) => ({
      ...prev,
      cover: prev.cover?.source === "library" && prev.cover.url === url ? null : prev.cover,
    }));
  };

  const handleBulkImageUpload = async () => {
    if (!bulkImage.files.length) return;
    if (!selectedProductIds.length) {
      toast.error("Vui lòng chọn sản phẩm trước khi tải ảnh");
      return;
    }
    setBulkImage((prev) => ({ ...prev, uploading: true }));
    let success = false;
    try {
      const fd = new FormData();
      bulkImage.files.forEach((item) => fd.append("files", item.file));
      if (bulkImage.cover?.source === "upload") {
        fd.append("coverIndex", String(bulkImage.cover.index));
        fd.append("coverMode", bulkImage.coverMode);
      }
      if (bulkImage.cover?.source === "library") {
        fd.append("skipCover", "1");
      }
      selectedProductIds.forEach((id) => fd.append("productIds", id));

      const res = await fetch("/api/admin/products/bulk-upload-image", {
        method: "POST",
        headers: makeHeaders(),
        body: fd,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          getErrorMessage(data, "Không thể tải ảnh cho sản phẩm đã chọn"),
        );
      }
      const uploadedImages = data?.uploadedImages ?? data?.uploaded ?? 0;
      const uploadedProducts = data?.uploadedProducts ?? selectedProductIds.length;
      toast.success(`Đã thêm ${uploadedImages} ảnh cho ${uploadedProducts} sản phẩm`);
      success = true;
    } catch (error) {
      setBulkImage((prev) => ({ ...prev, uploading: false }));
      throw error instanceof Error
        ? error
        : new Error("Không thể tải ảnh cho sản phẩm đã chọn");
      } finally {
      if (success) {
        releaseBulkPreviews(bulkImage.files.map((item) => item.preview));
        if (bulkImageInputRef.current) {
          bulkImageInputRef.current.value = "";
        }
        setBulkImage({
          files: [],
          uploading: false,
          cover: null,
          coverMode: "missing",
        });
      }
    }
  };

  const handleCommitImport = async (selectedOnly?: boolean) => {
    const selectedIdsSnapshot = [...selectedDraftIds];
    const importable = drafts.filter(
      (draft) => (draft.changeStatus ?? draft.mode) !== "duplicate",
    );
    const rowsToCommit =
      selectedOnly && selectedIdsSnapshot.length
        ? importable.filter((draft) => selectedIdsSnapshot.includes(draft.tempId))
        : importable;
    const hasError = rowsToCommit.some((row) => (row.issues?.length || 0) > 0);
    if (hasError) {
      toast.error("Có dòng lỗi, vui lòng sửa trước khi import");
      return;
    }
    if (!rowsToCommit.length) {
      toast.error("Không có sản phẩm để nhập");
      return;
    }
    try {
      setImportProgress({ step: "commit", current: 0, total: rowsToCommit.length });
      const res = await fetch("/api/admin/products/bulk-import?mode=commit", {
        method: "POST",
        headers: { ...makeHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ rows: rowsToCommit }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Import thất bại");
        setImportProgress(null);
        return;
      }
      setImportProgress(null);
      setImportOpen(false);
      setImportSelection("all");
      setDrafts((prev) =>
        selectedOnly ? prev.filter((draft) => !selectedIdsSnapshot.includes(draft.tempId)) : [],
      );
      setSelectedDraftIds([]);
      triggerReload();
      toast.success("Nhập sản phẩm hoàn tất");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể import sản phẩm");
      setImportProgress(null);
    }
  };

  // load options (types, brands, suppliers, spec definitions)
  useEffect(() => {
    let ignore = false;
    const fetchOptions = async () => {
      try {
        const [typesResp, brandsResp, categoriesResp, supplierResp, specDefResp] =
          await Promise.all([
            getJSON<ListResp<Option>>(
              "/api/admin/product-types?page=1&pageSize=200",
            ),
            getJSON<ListResp<Option>>(
              "/api/admin/brands?page=1&pageSize=200",
            ),
            getJSON<ListResp<Option>>(
              "/api/admin/categories?page=1&pageSize=200",
            ),
            getJSON<ListResp<{ id: string; name: string }>>(
              "/api/admin/suppliers?page=1&pageSize=200",
            ),
            // API mới: list definitions
            getJSON<ListResp<SpecDefOption>>(
              "/api/admin/spec-defs?page=1&pageSize=200",
            ),
          ]);

        if (ignore) return;
        const mappedTypes = typesResp.data.map((t) => ({
          ...t,
          slug: t.slug ?? slugify(t.name),
          categoryId: t.categoryId,
        }));
        const mappedBrands = brandsResp.data.map((b) => ({
          ...b,
          slug: b.slug ?? slugify(b.name),
        }));
        const mappedCategories = categoriesResp.data.map((c) => ({
          ...c,
          slug: c.slug ?? slugify(c.name),
        }));

        setTypes(mappedTypes);
        setBrands(mappedBrands);
        setCategories(mappedCategories);
        setSuppliers(supplierResp.data);
        setSpecDefs(specDefResp.data);

      setForm((prev) => ({
        ...prev,
        typeId: prev.typeId || typesResp.data[0]?.id || "",
        brandId: prev.brandId || "",
      }));
      } catch (err) {
        console.error("Failed to load product options", err);
      }
    };
    fetchOptions();
    return () => {
      ignore = true;
    };
  }, []);

  // ensure default typeId khi types load xong
  useEffect(() => {
    if (types.length && !form.typeId) {
      setForm((prev) => ({ ...prev, typeId: types[0].id }));
    }
  }, [types, form.typeId]);

  // load product list
  useEffect(() => {
    let ignore = false;
    const fetchProducts = async () => {
      setLoadingList(true);
      try {
        const params = new URLSearchParams({
          q: searchQuery,
          page: String(page),
          pageSize: String(pageSize),
          ...(filterBrand ? { brandId: filterBrand } : {}),
          ...(filterType ? { typeId: filterType } : {}),
          ...(sortKey
            ? (() => {
                const [key, dir] = sortKey.split("_");
                return { sortBy: key, sortOrder: dir };
              })()
            : {}),
        });
        const json = await getJSON<ListResp<Row>>(
          `/api/admin/products?${params.toString()}`,
        );
        if (ignore) return;
        setRows(json.data);
        setTotal(json.meta.total);
      } finally {
        if (!ignore) setLoadingList(false);
      }
    };

    fetchProducts();
    return () => {
      ignore = true;
    };
  }, [page, pageSize, searchQuery, reloadToken, filterBrand, filterType, sortKey]);

  useEffect(() => {
    setSelectedProductIds((prev) =>
      prev.filter((id) => rows.some((row) => row.id === id)),
    );
  }, [rows]);

  useEffect(() => {
    setGallerySelected([]);
  }, [galleryTypeId]);

  useEffect(() => {
    return () => {
      galleryUploadItems.forEach((item) => URL.revokeObjectURL(item.preview));
    };
  }, [galleryUploadItems]);

  const loadGalleryManager = async (
    typeId: string,
    options: { cursor?: string | null; append?: boolean } = {},
  ) => {
    setGalleryLoading(true);
    setGalleryError(null);
    try {
      const params = new URLSearchParams({ typeId });
      if (options.cursor) params.set("nextCursor", options.cursor);
      const res = await fetch(`/api/admin/products/gallery?${params.toString()}`, {
        headers: makeHeaders(),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(getErrorMessage(data, "Không thể tải ảnh từ Cloudinary"));
      }
      const items = (data?.items ?? []) as GalleryAsset[];
      setGalleryAssets((prev) => (options.append ? [...prev, ...items] : items));
      setGalleryNextCursor((data?.nextCursor as string | null) ?? null);
      if (!options.append) {
        setGallerySelected([]);
      }
    } catch (error) {
      const message = extractErrorMessage(error);
      setGalleryError(message);
      toast.error(message);
    } finally {
      setGalleryLoading(false);
    }
  };

  const handleGalleryUpload = async () => {
    if (!galleryTypeId) {
      toast.error("Vui lòng chọn loại sản phẩm");
      return;
    }
    if (!galleryUploadItems.length) {
      toast.error("Vui lòng chọn ảnh để tải lên");
      return;
    }
    const skuValue =
      galleryUploadSku.trim() ||
      selectedGalleryType?.slug ||
      selectedGalleryType?.name ||
      "gallery";

    setGalleryUploading(true);
    setGalleryUploadProgress({ done: 0, total: galleryUploadItems.length });
    try {
      for (const [idx, item] of galleryUploadItems.entries()) {
        const fd = new FormData();
        fd.append("file", item.file);
        fd.append("typeId", galleryTypeId);
        fd.append("sku", skuValue);
        fd.append("kind", "gallery");

        const res = await fetch("/api/admin/products/upload-temp", {
          method: "POST",
          headers: makeHeaders(),
          body: fd,
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(getErrorMessage(data, "Không thể upload ảnh"));
        }
        setGalleryUploadProgress((prev) =>
          prev ? { ...prev, done: Math.min(prev.total, idx + 1) } : prev,
        );
      }
      toast.success(`Đã upload ${galleryUploadItems.length} ảnh`);
      galleryUploadItems.forEach((item) => URL.revokeObjectURL(item.preview));
      setGalleryUploadItems([]);
      setGalleryUploadSku("");
      await loadGalleryManager(galleryTypeId);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể upload ảnh",
      );
    } finally {
      setGalleryUploading(false);
      setGalleryUploadProgress(null);
    }
  };

  const runGalleryDelete = async () => {
    if (!gallerySelected.length) return;
    try {
      const res = await fetch("/api/admin/products/gallery/manage", {
        method: "DELETE",
        headers: { ...makeHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ publicIds: gallerySelected }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(getErrorMessage(data, "Không thể xóa ảnh"));
      }
      toast.success(`Đã xóa ${gallerySelected.length} ảnh`);
      setGallerySelected([]);
      if (galleryTypeId) await loadGalleryManager(galleryTypeId);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể xóa ảnh",
      );
    }
  };


  const currentPageIds = rows.map((row) => row.id);
  const allCurrentSelected =
    currentPageIds.length > 0 &&
    currentPageIds.every((id) => selectedProductIds.includes(id));
  const someCurrentSelected = currentPageIds.some((id) =>
    selectedProductIds.includes(id),
  );
  const selectedCount = selectedProductIds.length;
  const toggleBulkLibrarySelection = (url: string) => {
    setBulkLibrarySelection((prev) =>
      prev.includes(url) ? prev.filter((item) => item !== url) : [...prev, url],
    );
    setBulkImage((prev) => ({
      ...prev,
      cover: prev.cover?.source === "library" && prev.cover.url === url ? null : prev.cover,
    }));
  };
  const openBulkLibraryPicker = () => {
    if (!selectedCount) {
      toast.error("Vui lòng chọn sản phẩm trước khi gán ảnh có sẵn");
      return;
    }
    const typeIdForLibrary = bulkType || filterType || null;
    if (!typeIdForLibrary) {
      toast.error("chức năng chỉ khả dụng khi đã sorting theo loại sản phẩm để tránh gây sai sót trong quá trình cập nhât");
      return;
    }
    fetchLibrary(undefined, { mode: "bulk", typeId: typeIdForLibrary });
  };
  const applyBulkLibrarySelection = async () => {
    if (!selectedCount) {
      toast.error("Vui lòng chọn sản phẩm trước khi gán ảnh");
      return false;
    }
    if (!bulkLibrarySelection.length) {
      toast.error("Vui lòng chọn ít nhất một ảnh trong thư viện");
      return false;
    }
    setBulkLibraryApplying(true);
    try {
      const payload: {
        productIds: string[];
        images: { url: string }[];
        coverUrl?: string;
        coverMode?: "missing" | "overwrite";
      } = {
        productIds: selectedProductIds,
        images: bulkLibrarySelection.map((url) => ({ url })),
      };
      if (
        bulkImage.cover?.source === "library" &&
        bulkLibrarySelection.includes(bulkImage.cover.url)
      ) {
        payload.coverUrl = bulkImage.cover.url;
        payload.coverMode = bulkImage.coverMode;
      }
      await postJSON("/api/admin/products/bulk-link-images", payload);
      toast.success(`Đã gán ${bulkLibrarySelection.length} ảnh cho sản phẩm đã chọn`);
      setBulkLibrarySelection([]);
      triggerReload();
      return true;
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể gán ảnh từ thư viện",
      );
      return false;
    } finally {
      setBulkLibraryApplying(false);
    }
  };
  const bulkImageTotalCount =
    bulkImage.files.length + bulkLibrarySelection.length;
  const bulkFormFilled = Boolean(
    bulkSupplier ||
      bulkStatus ||
      bulkQuote ||
      bulkType ||
      bulkImageTotalCount,
  );
  const bulkDisabled =
    !selectedCount ||
    !bulkFormFilled ||
    bulkUpdating ||
    bulkImage.uploading ||
    bulkLibraryApplying;
  const statusMap: Record<
    Row["status"],
    { label: string; className: string }
  > = {
    DRAFT: {
      label: "Nháp",
      className: "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-100",
    },
    PUBLISHED: {
      label: "Đang bán",
      className: "bg-green-50 text-green-700 ring-1 ring-green-100",
    },
    ARCHIVED: {
      label: "Lưu trữ",
      className: "bg-gray-100 text-gray-700 ring-1 ring-gray-200",
    },
  };

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate =
        someCurrentSelected && !allCurrentSelected;
    }
  }, [someCurrentSelected, allCurrentSelected]);

  const defaultBrandName = defaultBrand
    ? brands.find((b) => (b.slug ?? slugify(b.name)) === defaultBrand)?.name ?? defaultBrand
    : "Chưa chọn";
  const defaultTypeName = defaultType
    ? types.find((t) => (t.slug ?? slugify(t.name)) === defaultType)?.name ?? defaultType
    : "Chưa chọn";
  const defaultSupplierName = defaultSupplier
    ? suppliers.find((s) => s.id === defaultSupplier)?.name ?? defaultSupplier
    : "Chưa chọn";

  const handleToggleRow = (id: string, checked: boolean) => {
    setSelectedProductIds((prev) => {
      if (checked) {
        if (prev.includes(id)) return prev;
        if (prev.length >= MAX_SELECTION) {
          toast.error(`Chỉ chọn tối đa ${MAX_SELECTION} sản phẩm.`);
          return prev;
        }
        return [...prev, id];
      }
      return prev.filter((pid) => pid !== id);
    });
  };

  const handleToggleAllCurrent = (checked: boolean) => {
    const pageIds = rows.map((row) => row.id);
    setSelectedProductIds((prev) => {
      if (checked) {
        const set = new Set(prev);
        let added = 0;
        for (const id of pageIds) {
          if (set.has(id)) continue;
          if (set.size >= MAX_SELECTION) {
            if (added === 0) {
              toast.error(`Chỉ chọn tối đa ${MAX_SELECTION} sản phẩm.`);
            } else {
              toast.warning(`Đã chọn tối đa ${MAX_SELECTION} sản phẩm.`);
            }
            break;
          }
          set.add(id);
          added++;
        }
        return Array.from(set);
      }
      return prev.filter((id) => !pageIds.includes(id));
    });
  };

  const clearSelection = () => {
    setSelectedProductIds([]);
    clearBulkImage();
    setBulkLibrarySelection([]);
    setBulkImage((prev) => ({
      ...prev,
      cover: prev.cover?.source === "library" ? null : prev.cover,
    }));
  };

  const requestBulkUpdate = () => {
    if (!selectedCount) {
      toast.error("Vui lòng chọn sản phẩm cần cập nhật");
      return;
    }
    if (!bulkFormFilled) {
      toast.error("Chọn ít nhất một trường cần cập nhật");
      return;
    }
    setConfirmAction({ type: "bulk-update" });
  };

  const requestBulkDelete = () => {
    if (!selectedCount) {
      toast.error("Vui lòng chọn sản phẩm cần xóa");
      return;
    }
    setConfirmAction({ type: "bulk-delete" });
  };

  const requestRowDelete = (row: Row) => {
    setConfirmAction({ type: "row-delete", row });
  };

  const runBulkUpdate = async () => {
    if (!selectedCount) {
      toast.error("Vui lòng chọn sản phẩm cần cập nhật");
      return false;
    }
    if (!bulkFormFilled) {
      toast.error("Chọn ít nhất một trường cần cập nhật");
      return false;
    }

    setBulkUpdating(true);
    try {
    const basePayload: Record<string, unknown> = {
      productIds: selectedProductIds,
    };
    if (bulkSupplier) {
      basePayload.supplierId =
        bulkSupplier === "__clear__" ? null : bulkSupplier;
    }
    if (bulkStatus) basePayload.status = bulkStatus as Row["status"];
    if (bulkQuote) basePayload.requiresQuote = bulkQuote === "quote";
    if (bulkType) basePayload.typeId = bulkType;

    if (bulkSupplier || bulkStatus || bulkQuote || bulkType) {
      const res = await postJSON<{ updated: number }>(
        "/api/admin/products/bulk-update",
        basePayload,
      );
      toast.success(`Đã cập nhật ${res.updated} sản phẩm`);
      setBulkSupplier("");
      setBulkStatus("");
      setBulkQuote("");
      setBulkType("");
    }

      if (bulkImage.files.length) {
        await handleBulkImageUpload();
      }

      if (bulkLibrarySelection.length) {
        const applied = await applyBulkLibrarySelection();
        if (!applied) throw new Error("Không thể gán ảnh từ thư viện");
      }

      setSelectedProductIds([]);
      clearBulkImage();
      setBulkLibrarySelection([]);
      setBulkImage((prev) => ({ ...prev, cover: null }));
      triggerReload();
      return true;
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể cập nhật sản phẩm",
      );
      return false;
    } finally {
      setBulkUpdating(false);
    }
  };

  const runBulkDelete = async () => {
    if (!selectedCount) {
      toast.error("Vui lòng chọn sản phẩm cần xóa");
      return false;
    }

    setBulkDeleting(true);
    try {
      const res = await postJSON<{ deleted: number }>(
        "/api/admin/products/bulk-delete",
        { productIds: selectedProductIds },
      );
      toast.success(`Đã xóa ${res.deleted} sản phẩm`);
      setSelectedProductIds([]);
      clearBulkImage();
      setBulkLibrarySelection([]);
      setBulkImage((prev) => ({ ...prev, cover: null }));
      triggerReload();
      return true;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể xóa sản phẩm",
      );
      return false;
    } finally {
      setBulkDeleting(false);
    }
  };

  const runRowDelete = async (row: Row) => {
    setRowDeletingId(row.id);
    try {
      await postJSON("/api/admin/products/bulk-delete", {
        productIds: [row.id],
      });
      toast.success("Đã xóa sản phẩm");
      setSelectedProductIds((prev) => prev.filter((id) => id !== row.id));
      triggerReload();
      return true;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể xóa sản phẩm",
      );
      return false;
    } finally {
      setRowDeletingId((curr) => (curr === row.id ? null : curr));
    }
  };

  const confirmLoading =
    confirmAction?.type === "bulk-update"
      ? bulkUpdating
      : confirmAction?.type === "bulk-delete"
      ? bulkDeleting
      : confirmAction?.type === "row-delete"
      ? rowDeletingId === confirmAction.row.id
      : false;

  const confirmTitle =
    confirmAction?.type === "bulk-update"
      ? "Cập nhật nhanh sản phẩm"
      : confirmAction?.type === "bulk-delete"
      ? "Xóa các sản phẩm được chọn"
      : confirmAction?.type === "row-delete"
      ? "Xóa sản phẩm"
      : "";

  const bulkUpdateImageNote = bulkImageTotalCount
    ? `Ảnh: ${bulkImageTotalCount} ảnh${
        bulkImage.cover
          ? `, ảnh bìa từ ${bulkImage.cover.source === "library" ? "Cloudinary" : "tải lên"}`
          : ""
      }.`
    : "Ảnh: không thay đổi.";

  const confirmDescription =
    confirmAction?.type === "bulk-update"
      ? `Thao tác này sẽ cập nhật ${selectedCount} sản phẩm đã chọn. ${bulkUpdateImageNote}`
      : confirmAction?.type === "bulk-delete"
      ? `Thao tác này sẽ xóa ${selectedCount} sản phẩm và không thể hoàn tác.`
      : confirmAction?.type === "row-delete"
      ? `Bạn có chắc muốn xóa "${confirmAction.row.name}"? Hành động này không thể hoàn tác.`
      : "";

  const confirmButtonLabel =
    confirmAction?.type === "bulk-update"
      ? "Cập nhật"
      : confirmAction?.type === "bulk-delete"
      ? "Xóa"
      : confirmAction?.type === "row-delete"
      ? "Xóa"
      : "Đồng ý";

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    let ok = false;
    if (confirmAction.type === "bulk-update") {
      ok = await runBulkUpdate();
    } else if (confirmAction.type === "bulk-delete") {
      ok = await runBulkDelete();
    } else if (confirmAction.type === "row-delete") {
      ok = await runRowDelete(confirmAction.row);
    }
    if (ok) setConfirmAction(null);
  };

  const handleSearch = () => {
    const term = keyword.trim();
    setPage(1);
    if (term === searchQuery) {
      triggerReload();
    } else {
      setSearchQuery(term);
    }
  };

  const updateImageRow = (id: number, patch: Partial<ImageRow>) => {
    setImageRows((rows) =>
      rows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    );
  };

  const handleGalleryCropComplete = async (result: {
    file: File;
    previewUrl: string;
  }) => {
    const rowId = galleryTargetId;
    setGalleryCropOpen(false);
    if (rowId === null) return;
    setGalleryUploadingId(rowId);
    try {
      const row = imageRows.find((r) => r.id === rowId);
      let sequence: number | undefined;
      if (row?.sortOrder && row.sortOrder.trim()) {
        const parsed = Number(row.sortOrder.trim());
        if (Number.isFinite(parsed)) sequence = parsed;
      }
      if (sequence === undefined) {
        const idx = imageRows.findIndex((r) => r.id === rowId);
        if (idx >= 0) sequence = idx + 1;
      }
      const url = await uploadTempImage(result.file, "gallery", sequence);
      updateImageRow(rowId, { url });
      toast.success("Đã tải ảnh gallery");
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      URL.revokeObjectURL(result.previewUrl);
      setGalleryCropSource((prev) => {
        if (prev?.revokeOnClose && prev.url) {
          URL.revokeObjectURL(prev.url);
        }
        return null;
      });
      setGalleryUploadingId(null);
      setGalleryTargetId(null);
    }
  };

  const handleGalleryDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setGalleryCropOpen(false);
      setGalleryCropSource((prev) => {
        if (prev?.revokeOnClose && prev.url) {
          URL.revokeObjectURL(prev.url);
          return null;
        }
        return prev;
      });
    } else if (galleryCropSource) {
      setGalleryCropOpen(true);
    }
  };

  // Đồng bộ cover theo danh sách ảnh
  useEffect(() => {
    const validRows = imageRows.filter((row) => row.url.trim());
    const currentCoverRow =
      coverImageId !== null
        ? validRows.find((row) => row.id === coverImageId)
        : null;

    if (!validRows.length) {
      if (coverImageId !== null) setCoverImageId(null);
      if (form.coverImage) setForm((prev) => ({ ...prev, coverImage: "" }));
      return;
    }

    if (!currentCoverRow) {
      const first = validRows[0];
      setCoverImageId(first.id);
      if (form.coverImage !== first.url) {
        setForm((prev) => ({ ...prev, coverImage: first.url }));
      }
      return;
    }

    if (currentCoverRow.url && form.coverImage !== currentCoverRow.url) {
      setForm((prev) => ({ ...prev, coverImage: currentCoverRow.url }));
    }
  }, [imageRows, coverImageId, form.coverImage]);

  // ===== JSX =====
  return (
    <div className="mx-auto max-w-[1400px] xl:max-w-[95vw] space-y-5 px-2 xl:px-4">
      <ProductsTabs active="products" />

      {/* Upload products via file */}
          <div className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-2">
            <p className="text-xs font-semibold uppercase text-fuchsia-600 tracking-wide">
              NHẬP SẢN PHẨM TỪ FILE
            </p>
            <p className="text-sm text-gray-700 leading-relaxed">
              CSV/XLSX chỉ cần SKU, tên, mô tả, tồn kho, giá và thông số kỹ thuật. Thương hiệu, loại và nguồn hàng sẽ lấy theo giá trị mặc định bạn chọn bên dưới (không cần cột này trong file).
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  window.location.href = "/api/admin/products/bulk-import/template";
                }}
                className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold text-gray-800 hover:bg-gray-50"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Tải file mẫu
              </button>
            </div>
            <div className="flex flex-wrap gap-3 pt-2 text-xs text-gray-700">
              <div className="flex items-center gap-2">
                <span className="font-semibold">Thương hiệu mặc định:</span>
                <select
                  className="rounded border px-2 py-1"
                  value={defaultBrand}
                  onChange={(e) => setDefaultBrand(e.target.value)}
                >
                  <option value="">(Không đặt)</option>
                  {brands.map((b) => (
                    <option key={b.id || b.slug} value={b.slug ?? slugify(b.name)}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">Loại mặc định:</span>
                <select
                  className="rounded border px-2 py-1"
                  value={defaultType}
                  onChange={(e) => setDefaultType(e.target.value)}
                >
                  <option value="">(Không đặt)</option>
                  {types.map((t) => (
                    <option key={t.id || t.slug} value={t.slug ?? slugify(t.name)}>
                      {t.name}
                    </option>
                    ))}
                  </select>
                </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">Nguồn hàng mặc định:</span>
                <select
                  className="rounded border px-2 py-1"
                  value={defaultSupplier}
                  onChange={(e) => setDefaultSupplier(e.target.value)}
                >
                  <option value="">(Không đặt)</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-stretch gap-2">
            <label className="text-xs font-semibold text-gray-700">Kéo CSV vào hoặc bấm để chọn</label>
            <div
              className={`rounded-lg border-2 border-dashed px-4 py-6 text-center text-xs transition ${
                isDragOver
                  ? "border-fuchsia-500 bg-fuchsia-50"
                  : "border-gray-300 hover:border-fuchsia-400 hover:bg-gray-50"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragOver(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                const file = e.dataTransfer.files?.[0];
                if (file) requestImportConfirm({ mode: "drop", file });
              }}
              onClick={() => requestImportConfirm({ mode: "pick" })}
            >
              <p className="font-semibold text-gray-800 mb-1">Kéo file vào đây</p>
              <p className="text-gray-500">hoặc bấm để chọn file từ máy</p>
              <input
                ref={bulkFileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleBulkFile(file);
                  e.target.value = "";
                }}
              />
            </div>
            {previewLoading && <div className="text-xs text-gray-500">Đang phân tích file...</div>}
          </div>
        </div>
      </div>

      {drafts.length > 0 && (
        <div className="rounded-xl border bg-white p-4 space-y-3 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-semibold">Xem trước {drafts.length} sản phẩm</div>
              <div className="text-xs text-gray-500">
                Chỉnh sửa từng dòng hoặc áp dụng hàng loạt trước khi import.
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Đã chọn {selectedDraftIds.length}/{importableDrafts.length} sản phẩm (bỏ qua trùng lặp).
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
              <select
                className="rounded border px-2 py-1"
                defaultValue=""
                onChange={(e) => handleApplyBatch("brandSlug", e.target.value || undefined)}
              >
                <option value="">Gán thương hiệu</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={slugify(brand.name)}>
                    {brand.name}
                  </option>
                ))}
              </select>
              <select
                className="rounded border px-2 py-1"
                defaultValue=""
                onChange={(e) => handleApplyBatch("typeSlug", e.target.value || undefined)}
              >
                <option value="">Gán loại sản phẩm</option>
                {types.map((type) => (
                  <option key={type.id} value={slugify(type.name)}>
                    {type.name}
                  </option>
                ))}
              </select>
              <select
                className="rounded border px-2 py-1"
                defaultValue=""
                onChange={(e) => handleApplyBatch("supplierId", e.target.value || undefined)}
              >
                <option value="">Gán nguồn hàng</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
              <button
                disabled={!selectedDraftIds.length}
                onClick={handleRemoveSelected}
                className="rounded border border-red-500 px-3 py-2 font-semibold text-red-600 disabled:opacity-50"
              >
                Xóa đã chọn
              </button>
              <button
                disabled={!selectedDraftIds.length}
                onClick={() => {
                  if (!selectedDraftIds.length) return;
                  setImportSelection("selected");
                  setImportOpen(true);
                }}
                className="rounded bg-blue-600 px-3 py-2 font-semibold text-white disabled:opacity-50"
              >
                Nhập đã chọn
              </button>
              <button
                onClick={() => {
                  setImportSelection("all");
                  setImportOpen(true);
                }}
                className="rounded bg-green-600 px-3 py-2 font-semibold text-white"
              >
                Nhập tất cả
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border rounded-lg shadow-sm">
            <table className="min-w-full text-xs table-fixed">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2">
                    <input
                      type="checkbox"
                      className="h-5 w-5 cursor-pointer"
                      checked={
                        importableDrafts.length > 0 &&
                        selectedDraftIds.length === importableDrafts.length
                      }
                      onChange={(e) =>
                        setSelectedDraftIds(
                          e.target.checked
                            ? importableDrafts.map((d) => d.tempId)
                            : [],
                        )
                      }
                    />
                  </th>
                  <th className="px-3 py-2 text-left">SKU</th>
                  <th className="px-3 py-2 text-left">Tên</th>
                  <th className="px-3 py-2 text-left">Danh mục</th>
                  <th className="px-3 py-2 text-left">Thương hiệu</th>
                  <th className="px-3 py-2 text-left">Loại</th>
                  <th className="px-3 py-2 text-left">Nguồn hàng</th>
                  <th className="px-3 py-2 text-left">Giá</th>
                  <th className="px-3 py-2 text-left">Tồn kho</th>
                  <th className="px-3 py-2 text-left">Thông số kỹ thuật</th>
                  <th className="px-3 py-2 text-left">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {drafts.map((draft) => {
                  const checked = selectedDraftIds.includes(draft.tempId);
                  const status = draft.changeStatus ?? draft.mode;
                  const isImportable = status !== "duplicate";
                  const normalizeIssues = (keywords: string[]) =>
                    (draft.issues || []).filter((issue) =>
                      keywords.some((keyword) => issue.toLowerCase().includes(keyword)),
                    );
                  const skuIssues = normalizeIssues(["sku"]);
                  const nameIssues = normalizeIssues(["tên", "ten"]);
                  const typeIssues = normalizeIssues(["loại", "loai"]);
                  const unmatchedIssues = (draft.issues || []).filter(
                    (issue) =>
                      !["sku", "tên", "ten", "loại", "loai"].some((keyword) =>
                        issue.toLowerCase().includes(keyword),
                      ),
                  );
                  const hasError =
                    (draft.issues?.length || 0) > 0 ||
                    draft.missing.brand ||
                    draft.missing.type ||
                    (draft.missing.categories?.length || 0) > 0;
                  const isUpdate = status === "update";
                  const isDuplicate = status === "duplicate";
                  const rowBg = hasError
                    ? "bg-red-50 border-red-200"
                    : isUpdate
                    ? "bg-amber-50 border-amber-200"
                    : isDuplicate
                    ? "bg-gray-200 border-gray-300"
                    : "bg-blue-50 border-blue-200";
                  const rowBorder = hasError
                    ? "border-l-4 border-red-400"
                    : isUpdate
                    ? "border-l-4 border-amber-400"
                    : isDuplicate
                    ? "border-l-4 border-gray-500"
                    : "border-l-4 border-blue-400";
                  return (
                    <tr
                      key={draft.tempId}
                      className={`align-top ${rowBg} ${rowBorder} hover:brightness-95`}
                    >
                      <td
                        className="px-2 py-3 cursor-pointer align-middle"
                        onClick={(e) => {
                          if (!isImportable) return;
                          // tránh toggle khi bấm trực tiếp vào input/label con
                          if ((e.target as HTMLElement).tagName.toLowerCase() === "input") return;
                          setSelectedDraftIds((prev) =>
                            checked ? prev.filter((id) => id !== draft.tempId) : [...prev, draft.tempId],
                          );
                        }}
                      >
                        <input
                          type="checkbox"
                          className="h-5 w-5 cursor-pointer"
                          checked={checked && isImportable}
                          disabled={!isImportable}
                          onChange={(e) =>
                            isImportable &&
                            setSelectedDraftIds((prev) =>
                              e.target.checked
                                ? [...prev, draft.tempId]
                                : prev.filter((id) => id !== draft.tempId),
                            )
                          }
                        />
                      </td>
                      <td className="px-3 py-3 font-mono space-y-2">
                        <input
                          className="w-full rounded border px-2 py-1 font-mono"
                          value={draft.sku}
                          onChange={(e) =>
                            updateDraft(draft.tempId, { sku: e.target.value }, cleanupRules.sku)
                          }
                        />
                        <input
                          className="w-full rounded border px-2 py-1 text-[11px]"
                          placeholder="Slug (tùy chọn)"
                          value={draft.slug ?? ""}
                          onChange={(e) => updateDraft(draft.tempId, { slug: e.target.value })}
                        />
                        {skuIssues.map((issue) => (
                          <div key={issue} className="text-[10px] text-red-600">
                            {issue}
                          </div>
                        ))}
                      </td>
                      <td className="px-3 py-3 space-y-2">
                        <input
                          className="w-full rounded border px-2 py-1 font-semibold text-gray-900"
                          value={draft.name}
                          onChange={(e) =>
                            updateDraft(draft.tempId, { name: e.target.value }, cleanupRules.name)
                          }
                        />
                        <textarea
                          className="w-full rounded border px-2 py-1 text-xs"
                          rows={2}
                          placeholder="Mô tả ngắn"
                          value={draft.descriptionShort ?? ""}
                          onChange={(e) => updateDraft(draft.tempId, { descriptionShort: e.target.value })}
                        />
                        <textarea
                          className="w-full rounded border px-2 py-1 text-xs"
                          rows={3}
                          placeholder="Mô tả chi tiết"
                          value={draft.description ?? ""}
                          onChange={(e) => updateDraft(draft.tempId, { description: e.target.value })}
                        />
                        <div
                          className={`mt-1 inline-flex items-center rounded-full px-2 py-1 text-[11px] font-semibold border ${
                            status === "create"
                              ? "bg-blue-100 text-blue-800 border-blue-200"
                              : status === "duplicate"
                              ? "bg-gray-300 text-gray-900 border-gray-400"
                              : "bg-amber-100 text-amber-800 border-amber-200"
                          }`}
                        >
                          {status === "create"
                            ? "Tạo mới"
                            : status === "duplicate"
                            ? "Trùng lặp"
                            : "Cập nhật"}
                        </div>
                        {nameIssues.map((issue) => (
                          <div key={issue} className="text-[10px] text-red-600">
                            {issue}
                          </div>
                        ))}
                        {unmatchedIssues.map((issue) => (
                          <div key={issue} className="text-[10px] text-red-600">
                            {issue}
                          </div>
                        ))}
                      </td>
                  <td className="px-3 py-3">
                    <select
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={draft.primaryCategory ?? ""}
                      onChange={(e) =>
                        updateDraft(
                          draft.tempId,
                          { primaryCategory: e.target.value || null },
                          cleanupRules.primaryCategory,
                        )
                      }
                    >
                      <option value="">Chọn danh mục</option>
                      {categories.map((c) => (
                        <option key={c.id || c.slug} value={c.slug || ""}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    {draft.missing.categories?.length ? (
                      <div className="text-[10px] text-orange-600">
                        Danh mục không tồn tại: {draft.missing.categories.join(", ")}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-3">
                    <select
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={draft.brandSlug ?? ""}
                      onChange={(e) =>
                        updateDraft(draft.tempId, { brandSlug: e.target.value || null }, cleanupRules.brandSlug)
                      }
                    >
                      <option value="">Chọn thương hiệu</option>
                      {brands.map((b) => (
                        <option key={b.id || b.slug} value={b.slug || ""}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                    {draft.missing.brand && (
                      <div className="text-[10px] text-orange-600">
                        Thương hiệu không tồn tại: {draft.missing.brand}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <select
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={draft.typeSlug ?? ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        const matched = types.find(
                          (t) => t.slug === value || slugify(t.name) === slugify(value),
                        );
                        const patch: Partial<ProductDraft> = { typeSlug: value || null };
                        if (matched?.categoryId) {
                          const cat = categories.find((c) => c.id === matched.categoryId);
                          if (cat?.slug) {
                            patch.primaryCategory = cat.slug;
                          }
                        }
                        updateDraft(draft.tempId, patch, cleanupRules.typeSlug);
                      }}
                    >
                      <option value="">Chọn loại sản phẩm</option>
                      {types.map((t) => (
                        <option key={t.id || t.slug} value={t.slug || ""}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                    {typeIssues
                      .concat(draft.missing.type ? [`Loại sản phẩm không tồn tại: ${draft.missing.type}`] : [])
                      .map((issue) => (
                        <div key={issue} className="text-[10px] text-red-600">
                          {issue}
                        </div>
                      ))}
                  </td>
                  <td className="px-3 py-3">
                    <select
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={draft.supplierId ?? ""}
                      onChange={(e) =>
                        updateDraft(
                          draft.tempId,
                          {
                            supplierId: e.target.value || null,
                            supplierCode: suppliers.find((s) => s.id === e.target.value)?.name ?? null,
                          },
                          cleanupRules.supplierId,
                        )
                      }
                    >
                      <option value="">Chọn hoặc nhập</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    {draft.missing.supplier && (
                      <div className="text-[10px] text-orange-600">
                        Thiếu nguồn hàng: {draft.missing.supplier}
                      </div>
                    )}
                  </td>
                      <td className="px-3 py-3 text-xs space-y-1">
                        <label className="flex flex-col text-[11px]">
                          <span>Giá bán</span>
                          <input
                            type="number"
                            className="rounded border px-2 py-1"
                            value={draft.price ?? ""}
                            onChange={(e) =>
                              updateDraft(draft.tempId, {
                                price: e.target.value ? Number(e.target.value) : null,
                              })
                            }
                          />
                        </label>
                        <label className="flex flex-col text-[11px]">
                          <span>Niêm yết</span>
                          <input
                            type="number"
                            className="rounded border px-2 py-1"
                            value={draft.listPrice ?? ""}
                            onChange={(e) =>
                              updateDraft(draft.tempId, {
                                listPrice: e.target.value ? Number(e.target.value) : null,
                              })
                            }
                          />
                        </label>
                        <label className="flex flex-col text-[11px]">
                          <span>Giá nhập</span>
                          <input
                            type="number"
                            className="rounded border px-2 py-1"
                            value={draft.costPrice ?? ""}
                            onChange={(e) =>
                              updateDraft(draft.tempId, {
                                costPrice: e.target.value ? Number(e.target.value) : null,
                              })
                            }
                          />
                        </label>
                        <label className="flex flex-col text-[11px]">
                          <span>Tiền tệ</span>
                          <input
                            className="rounded border px-2 py-1"
                            value={draft.currency ?? ""}
                            onChange={(e) => updateDraft(draft.tempId, { currency: e.target.value })}
                          />
                        </label>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <input
                          type="number"
                          className="w-full rounded border px-2 py-1"
                          value={draft.stockOnHand ?? ""}
                          onChange={(e) =>
                            updateDraft(draft.tempId, {
                              stockOnHand: e.target.value ? Number(e.target.value) : null,
                            })
                          }
                        />
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <textarea
                          className="w-full rounded border px-2 py-1"
                          rows={5}
                          placeholder="Mỗi dòng hoặc dùng | : Tên: Giá trị"
                          value={specsToText(draft.specs)}
                          onChange={(e) => updateDraft(draft.tempId, { specs: textToSpecs(e.target.value) })}
                        />
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <button
                          className="rounded border border-red-500 px-2 py-1 text-red-600"
                          onClick={() => handleRemoveDraft(draft.tempId)}
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {/* Datalists cho ô nhập + chọn nhanh */}
            <datalist id="category-options">
              {categories.map((c) => (
                <option key={c.id || c.slug} value={c.slug || slugify(c.name)}>
                  {c.name}
                </option>
              ))}
            </datalist>
            <datalist id="brand-options">
              {brands.map((b) => (
                <option key={b.id || b.slug} value={b.slug || slugify(b.name)}>
                  {b.name}
                </option>
              ))}
            </datalist>
            <datalist id="type-options">
              {types.map((t) => (
                <option key={t.id || t.slug} value={t.slug || slugify(t.name)}>
                  {t.name}
                </option>
              ))}
            </datalist>
            <datalist id="supplier-options">
              {suppliers.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </datalist>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Quản lý sản phẩm
          </h1>
          <p className="text-sm text-gray-500">
            Danh sách sản phẩm đang bán trên AHSO Industrial. Tổng:{" "}
            <span className="font-semibold text-gray-700">{total}</span> sản
            phẩm.
          </p>
        </div>

        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:flex-nowrap sm:items-center">
          <div className="flex w-full max-w-md items-center gap-2">
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Tìm theo tên hoặc SKU..."
              className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={handleSearch}
              className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
            >
              Tìm
            </button>
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:flex-nowrap sm:items-center sm:justify-end">
            <select
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={filterBrand}
              onChange={(e) => {
                setFilterBrand(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Thương hiệu: tất cả</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <select
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Loại: tất cả</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <select
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={sortKey}
              onChange={(e) => {
                setSortKey(e.target.value);
                setPage(1);
              }}
            >
              <option value="updatedAt_desc">Sắp xếp: cập nhật mới → cũ</option>
              <option value="updatedAt_asc">Sắp xếp: cập nhật cũ → mới</option>
              <option value="name_asc">Tên A → Z</option>
              <option value="name_desc">Tên Z → A</option>
              <option value="sku_asc">SKU A → Z</option>
              <option value="sku_desc">SKU Z → A</option>
              <option value="brand_asc">Thương hiệu A → Z</option>
              <option value="brand_desc">Thương hiệu Z → A</option>
              <option value="type_asc">Loại A → Z</option>
              <option value="type_desc">Loại Z → A</option>
            </select>
          </div>
          <Link
            href="/admin/products/create"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1"
          >
            Thêm sản phẩm
          </Link>
        </div>
      </div>

      {/* Bảng sản phẩm */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <div className="font-semibold text-gray-800">
            Sản phẩm{" "}
            <span className="text-sm font-normal text-gray-500">
              (hiển thị {rows.length}/{total})
            </span>
          </div>
          {loadingList && (
            <div className="text-xs text-gray-400">Đang tải dữ liệu...</div>
          )}
        </div>
        <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-gray-700">
              Đã chọn{" "}
              <span className="font-semibold text-gray-900">
                {selectedCount}/{MAX_SELECTION}
              </span>{" "}
              sản phẩm
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="rounded border border-gray-300 bg-white px-2 py-1 text-sm"
                value={bulkSupplier}
                onChange={(e) => setBulkSupplier(e.target.value)}
              >
                <option value="">Nguồn hàng: giữ nguyên</option>
                <option value="__clear__">Bỏ nguồn hàng</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <select
                className="rounded border border-gray-300 bg-white px-2 py-1 text-sm"
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value)}
              >
                <option value="">Trạng thái: giữ nguyên</option>
                <option value="DRAFT">DRAFT</option>
                <option value="PUBLISHED">PUBLISHED</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
              <select
                className="rounded border border-gray-300 bg-white px-2 py-1 text-sm"
                value={bulkQuote}
                onChange={(e) => setBulkQuote(e.target.value)}
              >
                <option value="">Báo giá: giữ nguyên</option>
                <option value="direct">Bán trực tiếp</option>
                <option value="quote">Cần báo giá</option>
              </select>
              <select
                className="rounded border border-gray-300 bg-white px-2 py-1 text-sm"
                value={bulkType}
                onChange={(e) => setBulkType(e.target.value)}
              >
                <option value="">Loại sản phẩm: giữ nguyên</option>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleBulkImageButtonClick}
                  className="rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={bulkImage.uploading || bulkUpdating}
                >
                  Quản lý ảnh
                </button>
                {bulkImageTotalCount > 0 && (
                  <span className="text-xs text-gray-600">
                    Đã chọn {bulkImageTotalCount} ảnh
                  </span>
                )}
              </div>
              <button
                onClick={requestBulkUpdate}
                disabled={bulkDisabled}
                className={`rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-colors ${
                  bulkDisabled
                    ? "cursor-not-allowed opacity-60"
                    : "hover:bg-blue-700"
                }`}
              >
                Cập nhật nhanh
              </button>
              <button
                onClick={requestBulkDelete}
                disabled={!selectedCount || bulkDeleting}
                className="rounded border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 shadow-sm transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Xóa đã chọn
              </button>
              <button
                onClick={clearSelection}
                disabled={!selectedCount}
                className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Bỏ chọn
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-3 py-2 text-center">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={rows.length > 0 && allCurrentSelected}
                    onChange={(e) => handleToggleAllCurrent(e.target.checked)}
                  />
                </th>
            <th className="px-3 py-2 text-left">STT</th>
            <th className="px-3 py-2 text-left">Ảnh</th>
            <th className="px-3 py-2 text-left">Sản phẩm</th>
            <th className="px-3 py-2 text-left">Loại</th>
            <th className="px-3 py-2 text-left">Mã sản phẩm</th>
            <th className="px-3 py-2 text-left">Nguồn hàng</th>
            <th className="px-3 py-2 text-left">Giá</th>
            <th className="px-3 py-2 text-center">Tồn kho</th>
            <th className="px-3 py-2 text-center">Tình trạng bán</th>
                <th className="px-3 py-2 text-center">Trạng thái</th>
                <th className="px-3 py-2 text-left">Cập nhật</th>
                <th className="px-3 py-2 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r, idx) => {
                const cost = toNumberOrNull(r.costPrice);
                const sale = toNumberOrNull(r.price) ?? 0;
                const profit = cost != null ? sale - cost : null;
                const isSelected = selectedProductIds.includes(r.id);
                const rowNumber = (page - 1) * pageSize + idx + 1;

                return (
                  <tr
                    key={r.id}
                    className={`transition-colors hover:bg-gray-50/70 ${
                      isSelected ? "bg-blue-50/70" : ""
                    }`}
                  >
                    <td className="px-3 py-2 align-top text-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={isSelected}
                        onChange={(e) => handleToggleRow(r.id, e.target.checked)}
                      />
                    </td>
                    <td className="px-3 py-2 align-top text-xs text-gray-500">
                      {rowNumber}
                    </td>
                    <td className="px-3 py-2 align-top">
                      {r.coverImage ? (
                        <div className="relative h-14 w-14 overflow-hidden rounded-md border border-gray-200 bg-white">
                          <Image
                            src={r.coverImage}
                            alt={r.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50 text-[10px] text-gray-400">
                          Không ảnh
                        </div>
                      )}
                    </td>

                    <td className="px-3 py-2 align-top">
                      <Link
                        href={`/admin/products/${r.id}`}
                        className="line-clamp-2 text-sm font-semibold text-gray-900 hover:text-blue-600 hover:underline"
                      >
                        {r.name}
                      </Link>
                      <div className="mt-1 text-xs text-gray-500">
                        Thương hiệu: {r.brand?.name || "—"}
                      </div>
                    </td>

                    <td className="px-3 py-2 align-top text-xs text-gray-900">
                      <select
                        className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={r.type?.id ?? ""}
                        onChange={(e) => {
                          const nextTypeId = e.target.value;
                          if (!nextTypeId) {
                            toast.error("Loại sản phẩm là bắt buộc.");
                            return;
                          }
                          setRowUpdatingTypeId(r.id);
                          patchJSON(`/api/admin/products/${r.id}`, { typeId: nextTypeId })
                            .then(() => {
                              const typeName =
                                types.find((t) => t.id === nextTypeId)?.name || r.type?.name || "—";
                              setRows((prev) =>
                                prev.map((row) =>
                                  row.id === r.id ? { ...row, type: { id: nextTypeId, name: typeName } } : row,
                                ),
                              );
                              toast.success("Đã cập nhật loại sản phẩm");
                            })
                            .catch((error) => toast.error(extractErrorMessage(error)))
                            .finally(() => setRowUpdatingTypeId((curr) => (curr === r.id ? null : curr)));
                        }}
                        disabled={rowUpdatingTypeId === r.id}
                      >
                        <option value="">Chọn loại</option>
                        {types.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                      {rowUpdatingTypeId === r.id && (
                        <div className="mt-1 text-[11px] text-gray-500">Đang lưu...</div>
                      )}
                    </td>

                    <td className="px-3 py-2 align-top text-sm font-mono text-gray-900">
                      {r.sku}
                    </td>

                    <td className="px-3 py-2 align-top text-sm">
                      <div className="truncate text-gray-800">
                        {r.supplier?.name || "—"}
                      </div>
                      {r.supplierSku && (
                        <div className="mt-1 text-xs text-gray-500">
                          Mã NCC: {r.supplierSku}
                        </div>
                      )}
                    </td>

                    <td className="px-3 py-2 align-top text-sm text-gray-800">
                      <div>
                        Giá bán:{" "}
                        <span className="font-medium text-gray-900">
                          {formatCurrency(r.price, r.currency || "VND")}
                        </span>
                      </div>
                      <div className="mt-1">
                        Giá nhập:{" "}
                        <span>
                          {cost != null
                            ? formatCurrency(cost, r.currency || "VND")
                            : "—"}
                        </span>
                      </div>
                      <div className="mt-1">
                        Niêm yết:{" "}
                        <span>
                          {r.listPrice
                            ? formatCurrency(r.listPrice, r.currency || "VND")
                            : "—"}
                        </span>
                      </div>
                      <div className="mt-1">
                        Lãi:{" "}
                        <span>
                          {profit != null
                            ? formatCurrency(profit, r.currency || "VND")
                            : "—"}
                        </span>
                      </div>
                    </td>

                    <td className="px-3 py-2 align-top text-center text-sm">
                      <div className="font-medium text-gray-900">
                        {r.stockOnHand ?? 0}
                      </div>
                      {r.reorderLevel != null && (
                        <div className="mt-1 text-xs text-gray-500">
                          Cảnh báo: {r.reorderLevel}
                        </div>
                      )}
                      {r.minOrderQty != null && (
                        <div className="mt-1 text-xs text-gray-500">
                          MOQ: {r.minOrderQty}
                        </div>
                      )}
                    </td>

                    <td className="px-3 py-2 align-top text-center text-xs">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 font-medium ${
                          r.requiresQuote
                            ? "bg-amber-50 text-amber-700 ring-1 ring-amber-100"
                            : "bg-green-50 text-green-700 ring-1 ring-green-100"
                        }`}
                      >
                        {r.requiresQuote ? "Cần báo giá" : "Bán trực tiếp"}
                      </span>
                      {r.quoteNote && (
                        <div className="mt-1 line-clamp-2 text-xs text-gray-500">
                          {r.quoteNote}
                        </div>
                      )}
                    </td>

                    <td className="px-3 py-2 align-top text-center text-xs">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 font-medium ${statusMap[r.status].className}`}
                      >
                        {statusMap[r.status].label}
                      </span>
                    </td>

                    <td className="px-3 py-2 align-top text-xs text-gray-500">
                      {formatShortDate(r.updatedAt)}
                    </td>

                    <td className="px-3 py-2 align-top text-center text-xs">
                      <button
                        type="button"
                        onClick={() => requestRowDelete(r)}
                        className="rounded border border-red-200 bg-red-50 px-2 py-1 text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={rowDeletingId === r.id}
                      >
                        {rowDeletingId === r.id ? "Đang xóa…" : "Xóa nhanh"}
                      </button>
                    </td>
                  </tr>
                );
              })}

              {!rows.length && !loadingList && (
                <tr>
                  <td
                    className="px-3 py-6 text-center text-sm text-gray-500"
                    colSpan={13}
                  >
                    Không có dữ liệu
                  </td>
                </tr>
              )}

              {loadingList && !rows.length && (
                <tr>
                  <td
                    colSpan={13}
                    className="px-3 py-6 text-center text-sm text-gray-400"
                  >
                    Đang tải dữ liệu...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-sm text-gray-600">
          <div>
            Trang{" "}
            <span className="font-semibold">
              {page}/{totalPages}
            </span>{" "}
            · {total} sản phẩm
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Trước
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Sau
            </button>
          </div>
        </div>
      </div>

      {/* Form tạo nhanh – ẩn/hiện bằng nút */}
      <Dialog
        open={!!galleryConfirmAction}
        onOpenChange={(open) => {
          if (!open) setGalleryConfirmAction(null);
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {galleryConfirmAction?.type === "upload"
                ? "Xác nhận upload ảnh"
                : galleryConfirmAction?.type === "delete"
                ? "Xác nhận xóa ảnh"
                : ""}
            </DialogTitle>
            <DialogDescription>
              {galleryConfirmAction?.type === "upload"
                ? `Sẽ upload ${galleryUploadItems.length} ảnh vào ${galleryFolderPath || "thư mục đã chọn"}.`
                : galleryConfirmAction?.type === "delete"
                ? `Bạn sắp xóa ${gallerySelected.length} ảnh khỏi Cloudinary.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {galleryConfirmAction?.type === "upload" && galleryUploadItems.length > 0 && (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {galleryUploadItems.map((item, idx) => (
                <div
                  key={`${item.file.name}-${idx}`}
                  className="overflow-hidden rounded-lg border border-gray-200 bg-white"
                >
                  <div className="relative aspect-square w-full bg-gray-100">
                    <img
                      src={item.preview}
                      alt={item.file.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="p-2 text-[10px] text-gray-500 truncate">
                    {item.file.name}
                  </div>
                </div>
              ))}
            </div>
          )}
          <DialogFooter className="gap-2">
            <button
              type="button"
              className="rounded-md border px-4 py-2"
              onClick={() => setGalleryConfirmAction(null)}
              disabled={galleryUploading}
            >
              Hủy
            </button>
            <button
              type="button"
              className="rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-60"
              disabled={galleryUploading}
              onClick={async () => {
                if (!galleryConfirmAction) return;
                if (galleryConfirmAction.type === "upload") {
                  await handleGalleryUpload();
                } else if (galleryConfirmAction.type === "delete") {
                  await runGalleryDelete();
                }
                setGalleryConfirmAction(null);
              }}
            >
              {galleryUploading ? "Đang xử lý..." : "Xác nhận"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={bulkImageModalOpen}
        onOpenChange={setBulkImageModalOpen}
      >
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Quản lý ảnh cho sản phẩm đã chọn</DialogTitle>
            <DialogDescription>
              Ảnh sẽ được áp dụng khi bấm “Cập nhật nhanh” và xác nhận lần cuối.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => bulkImageInputRef.current?.click()}
              className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              disabled={bulkImage.uploading}
            >
              Chọn ảnh từ máy
            </button>
            <button
              type="button"
              onClick={openBulkLibraryPicker}
              className="rounded border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={bulkLibraryApplying || bulkUpdating}
            >
              Chọn từ thư viện Cloudinary
            </button>
            {bulkImageTotalCount > 0 && (
              <span className="text-xs text-gray-600">
                Đã chọn {bulkImageTotalCount} ảnh
              </span>
            )}
            {bulkImageTotalCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  clearBulkImage();
                  setBulkLibrarySelection([]);
                  setBulkImage((prev) => ({ ...prev, cover: null }));
                }}
                className="text-xs text-red-600 hover:underline"
                disabled={bulkImage.uploading}
              >
                Xóa tất cả ảnh đã chọn
              </button>
            )}
            <input
              ref={bulkImageInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleBulkImageChange}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm text-gray-700">
              <span>Chọn ảnh bìa</span>
              <select
                className="rounded border border-gray-300 bg-white px-2 py-1 text-xs disabled:opacity-60"
                value={bulkImage.coverMode}
                onChange={(e) =>
                  setBulkImage((prev) => ({
                    ...prev,
                    coverMode: e.target.value as BulkImageState["coverMode"],
                  }))
                }
                disabled={!bulkImage.cover}
              >
                <option value="missing">Chỉ đặt nếu chưa có</option>
                <option value="overwrite">Ghi đè ảnh bìa</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {bulkImage.files.map((item, idx) => {
                const isCover =
                  bulkImage.cover?.source === "upload" &&
                  bulkImage.cover.index === idx;
                return (
                  <div
                    key={`upload-${item.fileName}-${idx}`}
                    className={`group relative overflow-hidden rounded-lg border bg-white shadow-sm ${
                      isCover ? "border-blue-500 ring-2 ring-blue-100" : "border-gray-200"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setBulkImage((prev) => ({
                          ...prev,
                          cover:
                            prev.cover?.source === "upload" && prev.cover.index === idx
                              ? null
                              : { source: "upload", index: idx },
                        }))
                      }
                      className="block w-full"
                      title={isCover ? "Ảnh bìa" : "Chọn làm ảnh bìa"}
                    >
                      <div className="relative aspect-square w-full bg-gray-100">
                        <Image
                          src={item.preview}
                          alt={item.fileName}
                          fill
                          sizes="200px"
                          className="object-cover"
                          unoptimized
                        />
                        <div className="absolute left-2 top-2 rounded bg-gray-900/70 px-2 py-0.5 text-[10px] font-semibold text-white">
                          Upload
                        </div>
                        {isCover && (
                          <div className="absolute bottom-2 left-2 rounded bg-blue-600/90 px-2 py-0.5 text-[10px] font-semibold text-white">
                            Ảnh bìa
                          </div>
                        )}
                      </div>
                    </button>
                    <div className="flex items-center justify-between gap-2 px-2 py-1">
                      <span className="truncate text-[11px] text-gray-600">
                        {item.fileName}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeBulkImageAt(idx)}
                        className="text-[11px] text-red-600 hover:underline"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                );
              })}
              {bulkLibrarySelection.map((url) => {
                const isCover =
                  bulkImage.cover?.source === "library" && bulkImage.cover.url === url;
                return (
                  <div
                    key={`library-${url}`}
                    className={`group relative overflow-hidden rounded-lg border bg-white shadow-sm ${
                      isCover ? "border-blue-500 ring-2 ring-blue-100" : "border-gray-200"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setBulkImage((prev) => ({
                          ...prev,
                          cover:
                            prev.cover?.source === "library" && prev.cover.url === url
                              ? null
                              : { source: "library", url },
                        }))
                      }
                      className="block w-full"
                      title={isCover ? "Ảnh bìa" : "Chọn làm ảnh bìa"}
                    >
                      <div className="relative aspect-square w-full bg-gray-100">
                        <Image
                          src={url}
                          alt="Cloudinary"
                          fill
                          sizes="200px"
                          className="object-cover"
                        />
                        <div className="absolute left-2 top-2 rounded bg-blue-700/80 px-2 py-0.5 text-[10px] font-semibold text-white">
                          Cloudinary
                        </div>
                        {isCover && (
                          <div className="absolute bottom-2 left-2 rounded bg-blue-600/90 px-2 py-0.5 text-[10px] font-semibold text-white">
                            Ảnh bìa
                          </div>
                        )}
                      </div>
                    </button>
                    <div className="flex items-center justify-between gap-2 px-2 py-1">
                      <span className="truncate text-[11px] text-gray-600">
                        {url.split("/").pop()}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeBulkLibraryImage(url)}
                        className="text-[11px] text-red-600 hover:underline"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            {bulkImageTotalCount === 0 && (
              <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-gray-600">
                Chưa chọn ảnh nào.
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <button
              type="button"
              className="rounded border px-4 py-2"
              onClick={() => setBulkImageModalOpen(false)}
            >
              Đóng
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={libraryOpen}
        onOpenChange={(open) => {
          setLibraryOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Thư viện ảnh theo loại sản phẩm</DialogTitle>
            <DialogDescription>
              Chọn nhiều ảnh từ thư viện để dùng cho gallery hoặc ảnh bìa. Ảnh sẽ áp dụng khi bấm “Cập nhật nhanh”.
            </DialogDescription>
          </DialogHeader>
          {libraryError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {libraryError}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {libraryItems.map((asset) => (
              <button
                key={asset.publicId}
                type="button"
                onClick={() =>
                  libraryMode === "bulk"
                    ? toggleBulkLibrarySelection(asset.secureUrl)
                    : addImageFromLibrary(asset)
                }
                className={`group overflow-hidden rounded-lg border bg-white shadow-sm transition hover:border-blue-400 hover:shadow-md ${
                  libraryMode === "bulk" && bulkLibrarySelection.includes(asset.secureUrl)
                    ? "border-blue-500 ring-2 ring-blue-100"
                    : "border-gray-200"
                }`}
              >
                <div className="relative aspect-square w-full bg-gray-100">
                  <Image
                    src={asset.secureUrl}
                    alt={getAssetLabel(asset.publicId)}
                    fill
                    sizes="200px"
                    className="object-cover transition duration-200 group-hover:scale-[1.02]"
                  />
                  {libraryMode === "bulk" && bulkLibrarySelection.includes(asset.secureUrl) && (
                    <div className="absolute right-2 top-2 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold text-white shadow">
                      Chọn
                    </div>
                  )}
                </div>
                <div className="p-2 text-left">
                  <div className="text-[11px] font-semibold text-gray-800 truncate">
                    {getAssetLabel(asset.publicId)}
                  </div>
                  <div className="text-[10px] text-gray-500">
                    {(asset.width ?? 0)}x{(asset.height ?? 0)} • {((asset.bytes ?? 0) / 1024).toFixed(0)} KB
                  </div>
                </div>
              </button>
            ))}
          </div>
          {!libraryItems.length && !libraryLoading && (
            <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-gray-600">
              Chưa có ảnh trong thư viện loại sản phẩm này.
            </div>
          )}
          <DialogFooter className="flex items-center justify-between gap-2">
            <div className="text-xs text-gray-500">
              Thư mục: {libraryTypeId ? "gallery theo loại sản phẩm" : "—"}
            </div>
            <div className="flex gap-2">
              {libraryMode === "bulk" && (
                <>
                  <div className="self-center text-xs text-gray-600">
                    Đã chọn {bulkLibrarySelection.length} ảnh
                  </div>
                  <button
                    type="button"
                    onClick={() => setLibraryOpen(false)}
                    className="rounded border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                  >
                    Xác nhận chọn ảnh
                  </button>
                </>
              )}
              {libraryNextCursor ? (
                <button
                  type="button"
                  onClick={() =>
                    fetchLibrary(libraryNextCursor ?? undefined, {
                      mode: libraryMode,
                      typeId: libraryTypeId,
                    })
                  }
                  className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                  disabled={libraryLoading}
                >
                  {libraryLoading ? "Đang tải..." : "Tải thêm"}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setLibraryOpen(false)}
                className="rounded bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Đóng
              </button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={importConfirmOpen}
        onOpenChange={(open) => {
          if (!open) handleCancelImportConfirm();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Xác nhận thông tin mặc định</DialogTitle>
            <DialogDescription>
              Hệ thống sẽ dùng các giá trị mặc định này cho toàn bộ sản phẩm trong file.
              Vui lòng kiểm tra trước khi chọn / tải file.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm text-gray-700">
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
              <div>Thương hiệu: <span className="font-semibold">{defaultBrandName}</span></div>
              <div>Loại sản phẩm: <span className="font-semibold">{defaultTypeName}</span></div>
              <div>Nguồn hàng: <span className="font-semibold">{defaultSupplierName}</span></div>
            </div>
            {importIntent?.mode === "drop" && (
              <div className="text-xs text-gray-500">
                File sẽ xử lý: <span className="font-semibold text-gray-700">{importIntent.file.name}</span>
              </div>
            )}
            {(!defaultBrand || !defaultType) && (
              <div className="text-xs text-red-600">
                Bạn cần chọn thương hiệu và loại mặc định trước khi nhập file.
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <button
              type="button"
              className="rounded-md border px-4 py-2"
              onClick={handleCancelImportConfirm}
            >
              Huỷ
            </button>
            <button
              type="button"
              className="rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-60"
              onClick={handleConfirmImport}
              disabled={!defaultBrand || !defaultType}
            >
              Tôi đã chọn đúng
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!confirmAction}
        onOpenChange={(open) => {
          if (!open && !confirmLoading) setConfirmAction(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                <AlertTriangle className="h-6 w-6 text-amber-600" />
              </div>
              <DialogTitle>{confirmTitle}</DialogTitle>
            </div>
            <DialogDescription>{confirmDescription}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <button
              type="button"
              className="px-4 py-2 rounded-md border"
              onClick={() => setConfirmAction(null)}
              disabled={confirmLoading}
            >
              Hủy
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded-md bg-blue-600 text-white disabled:opacity-60"
              onClick={handleConfirmAction}
              disabled={confirmLoading}
            >
              {confirmLoading ? "Đang xử lý..." : confirmButtonLabel}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImageCropDialog
        open={galleryCropOpen && Boolean(galleryCropSource?.url)}
        imageSrc={galleryCropSource?.url ?? null}
        fileName={galleryCropSource?.fileName}
        aspectRatio={4 / 3}
        onOpenChange={handleGalleryDialogOpenChange}
        onComplete={handleGalleryCropComplete}
      />

      {importOpen && rowsToImport.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md space-y-4 p-4">
            <h2 className="text-lg font-semibold">Xác nhận nhập sản phẩm</h2>
            <p className="text-sm text-gray-600">
              {importSelection === "selected" ? "Chỉ nhập các dòng đã chọn." : "Nhập toàn bộ danh sách."} Sẽ nhập{" "}
              {rowsToImport.length} sản phẩm (
              {rowsToImport.filter((d) => (d.changeStatus ?? d.mode) === "create").length} tạo mới,{" "}
              {rowsToImport.filter((d) => (d.changeStatus ?? d.mode) === "update").length} cập nhật,{" "}
              {drafts.filter((d) => (d.changeStatus ?? d.mode) === "duplicate").length} trùng lặp đã bỏ qua).
            </p>
            {importProgress && (
              <div className="space-y-2 text-xs text-gray-500">
                <div>
                  {importProgress.step === "commit" ? "Đang ghi dữ liệu..." : "Đang upload ảnh..."}
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-green-600 transition-all"
                    style={{
                      width:
                        importProgress.total > 0
                          ? `${(importProgress.current / importProgress.total) * 100}%`
                          : "0%",
                    }}
                  />
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 text-sm">
              <button
                onClick={() => {
                  setImportOpen(false);
                  setImportSelection("all");
                }}
                className="rounded border px-3 py-2"
                disabled={!!importProgress}
              >
                Hủy
              </button>
              <button
                onClick={() => handleCommitImport(importSelection === "selected")}
                disabled={!!importProgress}
                className="rounded bg-green-600 px-3 py-2 font-semibold text-white disabled:opacity-60"
              >
                Xác nhận nhập
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function getErrorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "error" in payload) {
    const value = (payload as { error?: unknown }).error;
    if (typeof value === "string") return value;
  }
  return fallback;
}

function extractErrorMessage(error: unknown) {
  if (error instanceof Error) {
    try {
      const parsed = JSON.parse(error.message);
      if (parsed && typeof parsed.error === "string") {
        return parsed.error;
      }
    } catch {
      // ignore
    }
    return error.message || "Đã có lỗi xảy ra";
  }
  return "Đã có lỗi xảy ra";
}
