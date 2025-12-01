"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { AlertTriangle, FileSpreadsheet } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ImageCropDialog } from "@/components/image/image-crop-dialog";
import { getJSON, postJSON, makeHeaders } from "../_lib/fetcher";
import { slugify } from "@/lib/slug";

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

// Dòng thông số kỹ thuật nhập trên UI
type SpecRow = {
  id: number;
  definitionId?: string | null; // chọn spec có sẵn
  name: string;                 // tên thực tế gửi xuống API
  value: string;
  unit: string;
  note: string;
};

// Dòng ảnh gallery
type ImageRow = {
  id: number;
  url: string;
  alt: string;
  sortOrder: string; // nhập string, khi gửi convert sang number
};

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
  missing: {
    brand?: string;
    type?: string;
    supplier?: string;
    categories?: string[];
  };
};

type BulkImageState = {
  file: File | null;
  fileName: string;
  preview: string;
  uploading: boolean;
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

export default function ProductsPage() {
  const pageSize = 100;
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
  const [bulkImage, setBulkImage] = useState<BulkImageState>({
    file: null,
    fileName: "",
    preview: "",
    uploading: false,
  });
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [rowDeletingId, setRowDeletingId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  const [types, setTypes] = useState<Option[]>([]);
  const [brands, setBrands] = useState<Option[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [suppliers, setSuppliers] = useState<Option[]>([]);
  const [specDefs, setSpecDefs] = useState<SpecDefOption[]>([]); // ⬅️ danh sách spec có sẵn

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [creating, setCreating] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  // bảng thông số kỹ thuật
  const [specRows, setSpecRows] = useState<SpecRow[]>([
    { id: 1, name: "", value: "", unit: "", note: "" },
  ]);

  // bảng ảnh gallery
  const [imageRows, setImageRows] = useState<ImageRow[]>([
    { id: 1, url: "", alt: "", sortOrder: "" },
  ]);
  const selectAllRef = useRef<HTMLInputElement | null>(null);
  const coverFileInputRef = useRef<HTMLInputElement | null>(null);
  const galleryFileInputRef = useRef<HTMLInputElement | null>(null);
  const [coverCropOpen, setCoverCropOpen] = useState(false);
  const [coverCropSource, setCoverCropSource] = useState<{
    url: string;
    fileName: string;
    revokeOnClose: boolean;
  } | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [galleryCropOpen, setGalleryCropOpen] = useState(false);
  const [galleryCropSource, setGalleryCropSource] = useState<{
    url: string;
    fileName: string;
    revokeOnClose: boolean;
  } | null>(null);
  const [galleryTargetId, setGalleryTargetId] = useState<number | null>(null);
  const [galleryUploadingId, setGalleryUploadingId] = useState<number | null>(null);
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
  const [defaultBrand, setDefaultBrand] = useState("");
  const [defaultType, setDefaultType] = useState("");
  const [defaultSupplier, setDefaultSupplier] = useState("");
  const bulkFileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rowsToImport =
    importSelection === "selected"
      ? drafts.filter((draft) => selectedDraftIds.includes(draft.tempId))
      : drafts;

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

  const handleBulkFile = async (file: File) => {
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
  const releaseBulkPreview = (url?: string) => {
    if (url) URL.revokeObjectURL(url);
  };

  useEffect(() => {
    return () => {
      releaseBulkPreview(bulkImage.preview);
    };
  }, [bulkImage.preview]);

  const handleBulkImageButtonClick = () => {
    bulkImageInputRef.current?.click();
  };

  const handleBulkImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    releaseBulkPreview(bulkImage.preview);
    if (!file) {
      if (bulkImageInputRef.current) bulkImageInputRef.current.value = "";
      setBulkImage({ file: null, fileName: "", preview: "", uploading: false });
      return;
    }
    const preview = URL.createObjectURL(file);
    setBulkImage({
      file,
      fileName: file.name,
      preview,
      uploading: false,
    });
  };

  const clearBulkImage = () => {
    releaseBulkPreview(bulkImage.preview);
    if (bulkImageInputRef.current) bulkImageInputRef.current.value = "";
    setBulkImage({ file: null, fileName: "", preview: "", uploading: false });
  };

  const handleBulkImageUpload = async () => {
    if (!bulkImage.file) return;
    if (!selectedProductIds.length) {
      toast.error("Vui lòng chọn sản phẩm trước khi tải ảnh");
      return;
    }
    const file = bulkImage.file;
    const previewUrl = bulkImage.preview;
    setBulkImage((prev) => ({ ...prev, uploading: true }));
    let success = false;
    try {
      const fd = new FormData();
      fd.append("file", file);
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
      toast.success(`Đã thêm ảnh cho ${data?.uploaded ?? 0} sản phẩm`);
      success = true;
    } catch (error) {
      setBulkImage((prev) => ({ ...prev, uploading: false }));
      throw error instanceof Error
        ? error
        : new Error("Không thể tải ảnh cho sản phẩm đã chọn");
    } finally {
      if (success) {
        releaseBulkPreview(previewUrl);
        if (bulkImageInputRef.current) {
          bulkImageInputRef.current.value = "";
        }
        setBulkImage({
          file: null,
          fileName: "",
          preview: "",
          uploading: false,
        });
      }
    }
  };

  const handleCommitImport = async (selectedOnly?: boolean) => {
    const selectedIdsSnapshot = [...selectedDraftIds];
    const rowsToCommit =
      selectedOnly && selectedIdsSnapshot.length
        ? drafts.filter((draft) => selectedIdsSnapshot.includes(draft.tempId))
        : drafts;
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
  }, [page, pageSize, searchQuery, reloadToken]);

  useEffect(() => {
    setSelectedProductIds((prev) =>
      prev.filter((id) => rows.some((row) => row.id === id)),
    );
  }, [rows]);

  const currentPageIds = rows.map((row) => row.id);
  const allCurrentSelected =
    currentPageIds.length > 0 &&
    currentPageIds.every((id) => selectedProductIds.includes(id));
  const someCurrentSelected = currentPageIds.some((id) =>
    selectedProductIds.includes(id),
  );
  const selectedCount = selectedProductIds.length;
  const bulkFormFilled = Boolean(
    bulkSupplier || bulkStatus || bulkQuote || bulkImage.file,
  );
  const bulkDisabled =
    !selectedCount || !bulkFormFilled || bulkUpdating || bulkImage.uploading;
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

      if (bulkSupplier || bulkStatus || bulkQuote) {
        const res = await postJSON<{ updated: number }>(
          "/api/admin/products/bulk-update",
          basePayload,
        );
        toast.success(`Đã cập nhật ${res.updated} sản phẩm`);
        setBulkSupplier("");
        setBulkStatus("");
        setBulkQuote("");
      }

      if (bulkImage.file) {
        await handleBulkImageUpload();
      }

      setSelectedProductIds([]);
      clearBulkImage();
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

  const confirmDescription =
    confirmAction?.type === "bulk-update"
      ? `Thao tác này sẽ cập nhật ${selectedCount} sản phẩm đã chọn.`
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

  const resetForm = () => {
    setForm({
      ...DEFAULT_FORM,
      typeId: types[0]?.id || "",
    });
    setSpecRows([{ id: 1, name: "", value: "", unit: "", note: "" }]);
    setImageRows([{ id: 1, url: "", alt: "", sortOrder: "" }]);
  };

  const handleCreate = async () => {
    if (!form.name.trim() || !form.sku.trim() || !form.typeId) return;
    if (!form.requiresQuote && !form.price) return;

    setCreating(true);
    try {
      const parseNumber = (value: string) => {
        const trimmed = value.trim();
        if (!trimmed) return undefined;
        const num = Number(trimmed);
        return Number.isFinite(num) ? num : undefined;
      };
      const parsePercent = (value: string) => {
        const trimmed = value.trim().replace(",", ".");
        if (!trimmed) return undefined;
        const num = Number(trimmed);
        if (!Number.isFinite(num)) return undefined;
        return num / 100;
      };

      // map specRows -> specs gửi xuống API
      const specsPayload = specRows
        .filter(
          (s) =>
            s.name.trim() &&
            (s.value.trim() || s.unit.trim() || s.note.trim()),
        )
        .map((s, idx) => ({
          name: s.name.trim(), // dùng name, backend tự upsert definition theo slug
          valueString: s.value.trim() || undefined,
          unitOverride: s.unit.trim() || undefined,
          note: s.note.trim() || undefined,
          sortOrder: idx,
        }));

      // map imageRows -> images gửi xuống API
      const imagesPayload = imageRows
        .filter((img) => img.url.trim())
        .map((img, idx) => {
          const sort = img.sortOrder.trim();
          const sortNum = sort ? Number(sort) : idx;
          return {
            url: img.url.trim(),
            alt: img.alt.trim() || undefined,
            sortOrder: Number.isFinite(sortNum) ? sortNum : idx,
          };
        });

      await postJSON("/api/admin/products", {
        name: form.name.trim(),
        sku: form.sku.trim(),
        slug: form.slug.trim() || undefined,
        typeId: form.typeId,
        brandId: form.brandId || undefined,
        supplierId: form.supplierId || undefined,
        supplierSku: form.supplierSku.trim() || undefined,
        price: form.requiresQuote ? 0 : Number(form.price || 0),
        listPrice: parseNumber(form.listPrice),
        costPrice: parseNumber(form.costPrice),
        currency: form.currency || "VND",
        requiresQuote: form.requiresQuote,
        quoteNote: form.quoteNote.trim() || undefined,
        taxRate: parsePercent(form.taxRate),
        taxIncluded: form.taxIncluded,
        stockOnHand: parseNumber(form.stockOnHand),
        reorderLevel: parseNumber(form.reorderLevel),
        minOrderQty: parseNumber(form.minOrderQty),
        coverImage: form.coverImage || undefined,
        status: form.status as Row["status"],
        description: form.description || undefined,
        images: imagesPayload,
        specs: specsPayload,
      });

      resetForm();
      triggerReload();
    } finally {
      setCreating(false);
    }
  };

  const canSubmit = Boolean(
    form.name.trim() &&
      form.sku.trim() &&
      form.typeId &&
      (form.requiresQuote || form.price),
  );

  const addSpecRow = () => {
    setSpecRows((rows) => [
      ...rows,
      {
        id: rows.length ? rows[rows.length - 1].id + 1 : 1,
        name: "",
        value: "",
        unit: "",
        note: "",
      },
    ]);
  };

  const removeSpecRow = (id: number) => {
    setSpecRows((rows) =>
      rows.length <= 1 ? rows : rows.filter((r) => r.id !== id),
    );
  };

  const updateSpecRow = (id: number, patch: Partial<SpecRow>) => {
    setSpecRows((rows) =>
      rows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    );
  };

  const addImageRow = () => {
    setImageRows((rows) => [
      ...rows,
      {
        id: rows.length ? rows[rows.length - 1].id + 1 : 1,
        url: "",
        alt: "",
        sortOrder: "",
      },
    ]);
  };

  const removeImageRow = (id: number) => {
    setImageRows((rows) =>
      rows.length <= 1 ? rows : rows.filter((r) => r.id !== id),
    );
  };

  const updateImageRow = (id: number, patch: Partial<ImageRow>) => {
    setImageRows((rows) =>
      rows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    );
  };

  const handleCoverUploadClick = () => {
    if (!ensureUploadPrerequisites()) return;
    coverFileInputRef.current?.click();
  };

  const handleCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (coverFileInputRef.current) {
      coverFileInputRef.current.value = "";
    }
    const url = URL.createObjectURL(file);
    setCoverCropSource((prev) => {
      if (prev?.revokeOnClose && prev.url) {
        URL.revokeObjectURL(prev.url);
      }
      return { url, fileName: file.name, revokeOnClose: true };
    });
    setCoverCropOpen(true);
  };

  const handleCoverCropComplete = async (result: {
    file: File;
    previewUrl: string;
  }) => {
    setCoverCropOpen(false);
    setCoverUploading(true);
    try {
      const url = await uploadTempImage(result.file, "cover", 0);
      setForm((prev) => ({ ...prev, coverImage: url }));
      toast.success("Đã tải ảnh đại diện");
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      URL.revokeObjectURL(result.previewUrl);
      setCoverCropSource((prev) => {
        if (prev?.revokeOnClose && prev.url) {
          URL.revokeObjectURL(prev.url);
        }
        return null;
      });
      setCoverUploading(false);
    }
  };

  const handleGalleryUploadClick = (rowId: number) => {
    if (!ensureUploadPrerequisites()) return;
    setGalleryTargetId(rowId);
    galleryFileInputRef.current?.click();
  };

  const handleGalleryFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    if (galleryFileInputRef.current) {
      galleryFileInputRef.current.value = "";
    }
    if (!ensureUploadPrerequisites()) return;

    // Nếu chọn nhiều ảnh: upload tuần tự, tự thêm dòng ảnh
    if (files.length > 1) {
      setGalleryUploadingId(-1);
      try {
        let nextId = imageRows.length ? imageRows[imageRows.length - 1].id + 1 : 1;
        const sequenceBase = imageRows.length ? imageRows.length + 1 : 1;
        const targetId = galleryTargetId ?? imageRows[0]?.id ?? null;
        let rows = [...imageRows];

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const sequence = sequenceBase + i;
          const url = await uploadTempImage(file, "gallery", sequence);

          if (i === 0 && targetId !== null) {
            rows = rows.map((r) => (r.id === targetId ? { ...r, url, sortOrder: String(sequence) } : r));
          } else {
            rows = [
              ...rows,
              { id: nextId++, url, alt: "", sortOrder: String(sequence) },
            ];
          }
        }
        setImageRows(rows);
        toast.success(`Đã tải ${files.length} ảnh`);
      } catch (error) {
        toast.error(extractErrorMessage(error));
      } finally {
        setGalleryUploadingId(null);
        setGalleryTargetId(null);
      }
      return;
    }

    // Một ảnh: dùng flow crop cũ
    const file = files[0];
    const url = URL.createObjectURL(file);
    setGalleryCropSource((prev) => {
      if (prev?.revokeOnClose && prev.url) {
        URL.revokeObjectURL(prev.url);
      }
      return { url, fileName: file.name, revokeOnClose: true };
    });
    setGalleryCropOpen(true);
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

  const handleCoverDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setCoverCropOpen(false);
      setCoverCropSource((prev) => {
        if (prev?.revokeOnClose && prev.url) {
          URL.revokeObjectURL(prev.url);
          return null;
        }
        return prev;
      });
    } else if (coverCropSource) {
      setCoverCropOpen(true);
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

  // ===== JSX =====
  return (
    <div className="mx-auto max-w-[1400px] xl:max-w-[95vw] space-y-5 px-2 xl:px-4">
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
            <label className="text-xs font-semibold text-gray-700">Kéo CSV/XLSX vào hoặc bấm để chọn</label>
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
                if (file) handleBulkFile(file);
              }}
              onClick={() => bulkFileInputRef.current?.click()}
            >
              <p className="font-semibold text-gray-800 mb-1">Kéo file vào đây</p>
              <p className="text-gray-500">hoặc bấm để chọn file từ máy</p>
              <input
                ref={bulkFileInputRef}
                type="file"
                accept=".csv,.xlsx"
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
                Đã chọn {selectedDraftIds.length}/{drafts.length} sản phẩm.
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
                      checked={selectedDraftIds.length === drafts.length}
                      onChange={(e) =>
                        setSelectedDraftIds(e.target.checked ? drafts.map((d) => d.tempId) : [])
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
                  const hasError = (draft.issues?.length || 0) > 0 || draft.missing.brand || draft.missing.type || (draft.missing.categories?.length || 0) > 0;
                  const isUpdate = draft.mode === "update";
                  const rowBg = hasError
                    ? "bg-red-50 border-red-200"
                    : isUpdate
                    ? "bg-amber-50 border-amber-200"
                    : "bg-blue-50 border-blue-200";
                  const rowBorder = hasError
                    ? "border-l-4 border-red-400"
                    : isUpdate
                    ? "border-l-4 border-amber-400"
                    : "border-l-4 border-blue-400";
                  return (
                    <tr
                      key={draft.tempId}
                      className={`align-top ${rowBg} ${rowBorder} hover:brightness-95`}
                    >
                      <td
                        className="px-2 py-3 cursor-pointer align-middle"
                        onClick={(e) => {
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
                          checked={checked}
                          onChange={(e) =>
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
                            draft.mode === "create"
                              ? "bg-blue-100 text-blue-800 border-blue-200"
                              : "bg-amber-100 text-amber-800 border-amber-200"
                          }`}
                        >
                          {draft.mode === "create" ? "Tạo mới" : "Cập nhật"}
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

        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
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
          <button
            onClick={() => setShowCreate((v) => !v)}
            className="inline-flex items-center justify-center rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1"
          >
            {showCreate ? "Ẩn form tạo" : "Thêm sản phẩm"}
          </button>
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
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleBulkImageButtonClick}
                  className="rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={bulkImage.uploading || bulkUpdating}
                >
                  {bulkImage.fileName ? "Đổi ảnh" : "Tải ảnh lên"}
                </button>
                {bulkImage.fileName && (
                  <div className="flex items-center gap-2">
                    <div className="relative h-8 w-8 overflow-hidden rounded border border-gray-200 bg-white">
                      <Image
                        src={bulkImage.preview}
                        alt="Bulk preview"
                        fill
                        sizes="32px"
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    <span className="max-w-[120px] truncate text-xs text-gray-600">
                      {bulkImage.fileName}
                    </span>
                    <button
                      type="button"
                      onClick={clearBulkImage}
                      className="text-xs text-red-600 hover:underline disabled:opacity-60"
                      disabled={bulkImage.uploading}
                    >
                      Xóa
                    </button>
                  </div>
                )}
                <input
                  ref={bulkImageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleBulkImageChange}
                />
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
                      <div className="mt-1 text-xs text-gray-400">
                        Loại: {r.type?.name || "—"}
                      </div>
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
                    colSpan={12}
                  >
                    Không có dữ liệu
                  </td>
                </tr>
              )}

              {loadingList && !rows.length && (
                <tr>
                  <td
                    colSpan={12}
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
      {showCreate && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-3">
            <div>
              <div className="text-base font-semibold text-gray-900">
                Thêm sản phẩm nhanh
              </div>
              <p className="text-xs text-gray-500">
                Nhập tối thiểu tên, SKU, loại sản phẩm và giá (hoặc chọn
                &quot;Cần báo giá&quot;). Có thể chọn thông số kỹ thuật có sẵn
                hoặc tạo mới, và thêm nhiều ảnh.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={resetForm}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
              >
                Xoá form
              </button>
              <button
                onClick={handleCreate}
                disabled={!canSubmit || creating}
                className="inline-flex items-center rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creating ? "Đang tạo..." : "Thêm sản phẩm"}
              </button>
            </div>
          </div>

          {/* ==== FORM CHÍNH ==== */}
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {/* Tên + SKU */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Tên sản phẩm <span className="text-red-500">*</span>
              </label>
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
                placeholder="VD: Băng tải PVC 800x4000mm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                SKU nội bộ <span className="text-red-500">*</span>
              </label>
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={form.sku}
                onChange={(e) =>
                  setForm({ ...form, sku: e.target.value })
                }
                placeholder="Mã sản phẩm duy nhất"
              />
            </div>

            {/* Slug + Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Slug
              </label>
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={form.slug}
                onChange={(e) =>
                  setForm({ ...form, slug: e.target.value })
                }
                placeholder="Tự tạo nếu bỏ trống"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Loại sản phẩm <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={form.typeId}
                onChange={(e) =>
                  setForm({ ...form, typeId: e.target.value })
                }
              >
                <option value="">Chọn loại</option>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Brand + Supplier */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Thương hiệu
              </label>
              <select
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={form.brandId}
                onChange={(e) =>
                  setForm({ ...form, brandId: e.target.value })
                }
              >
                <option value="">— Không chọn —</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Nhà cung cấp
              </label>
              <select
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={form.supplierId}
                onChange={(e) =>
                  setForm({ ...form, supplierId: e.target.value })
                }
              >
                <option value="">— Không chọn —</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Supplier SKU + Giá */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                SKU nhà cung cấp
              </label>
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={form.supplierSku}
                onChange={(e) =>
                  setForm({ ...form, supplierSku: e.target.value })
                }
                placeholder="Mã sản phẩm phía NCC"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Giá bán{" "}
                {form.requiresQuote ? null : (
                  <span className="text-red-500">*</span>
                )}
              </label>
              <input
                type="number"
                min="0"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={form.price}
                onChange={(e) =>
                  setForm({ ...form, price: e.target.value })
                }
                placeholder="Giá bán (VND)"
                disabled={form.requiresQuote}
              />
            </div>

            {/* List price + Cost price */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Giá niêm yết
              </label>
              <input
                type="number"
                min="0"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={form.listPrice}
                onChange={(e) =>
                  setForm({ ...form, listPrice: e.target.value })
                }
                placeholder="Có thể bỏ trống"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Giá nhập (Cost)
              </label>
              <input
                type="number"
                min="0"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={form.costPrice}
                onChange={(e) =>
                  setForm({ ...form, costPrice: e.target.value })
                }
                placeholder="Giá nhập từ NCC"
              />
            </div>

            {/* Requires quote + note */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Báo giá
              </label>
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.requiresQuote}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      requiresQuote: e.target.checked,
                    })
                  }
                />
                <span>Cần báo giá riêng (không hiển thị giá trên web)</span>
              </div>
              <textarea
                className="min-h-20 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={form.quoteNote}
                onChange={(e) =>
                  setForm({ ...form, quoteNote: e.target.value })
                }
                placeholder="Ghi chú cho báo giá (ví dụ: giá theo số lượng, điều kiện giao hàng...)"
              />
            </div>

            {/* Thuế + ảnh + status */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Thuế VAT (%)
              </label>
              <input
                type="number"
                step="0.01"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={form.taxRate}
                onChange={(e) =>
                  setForm({ ...form, taxRate: e.target.value })
                }
                placeholder="Ví dụ: 10"
              />
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.taxIncluded}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      taxIncluded: e.target.checked,
                    })
                  }
                />
                Giá hiển thị đã bao gồm VAT
              </label>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Ảnh đại diện
              </label>
              <div className="space-y-2">
                <input
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={form.coverImage}
                  onChange={(e) =>
                    setForm({ ...form, coverImage: e.target.value })
                  }
                  placeholder="https://..."
                />
                <div className="flex flex-wrap gap-2 text-xs">
                  <button
                    type="button"
                    onClick={handleCoverUploadClick}
                    className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                    disabled={coverUploading}
                  >
                    {coverUploading ? "Đang tải..." : "Tải ảnh"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({ ...prev, coverImage: "" }))
                    }
                    className="inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Xoá URL
                  </button>
                </div>
                <input
                  ref={coverFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleCoverFileChange}
                />
              </div>
              <label className="text-sm font-medium text-gray-700">
                Trạng thái
              </label>
              <select
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={form.status}
                onChange={(e) =>
                  setForm({
                    ...form,
                    status: e.target.value as FormState["status"],
                  })
                }
              >
                <option value="DRAFT">DRAFT (Nháp)</option>
                <option value="PUBLISHED">PUBLISHED (Đang bán)</option>
                <option value="ARCHIVED">ARCHIVED (Lưu trữ)</option>
              </select>
            </div>

            {/* Tồn kho / MOQ / ReorderLevel */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Tồn kho ban đầu
              </label>
              <input
                type="number"
                min="0"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={form.stockOnHand}
                onChange={(e) =>
                  setForm({ ...form, stockOnHand: e.target.value })
                }
                placeholder="0"
              />
              <label className="text-sm font-medium text-gray-700">
                Mức cảnh báo tồn kho
              </label>
              <input
                type="number"
                min="0"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={form.reorderLevel}
                onChange={(e) =>
                  setForm({ ...form, reorderLevel: e.target.value })
                }
                placeholder="VD: 10"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                MOQ (Min order qty)
              </label>
              <input
                type="number"
                min="0"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={form.minOrderQty}
                onChange={(e) =>
                  setForm({ ...form, minOrderQty: e.target.value })
                }
                placeholder="VD: 1"
              />
            </div>

            {/* Mô tả */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-gray-700">
                Mô tả ngắn
              </label>
              <textarea
                className="min-h-[120px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Giới thiệu tổng quan, điểm nổi bật..."
              />
            </div>
          </div>

          {form.coverImage && (
            <div className="mt-4 flex items-center gap-4">
              <span className="text-sm text-gray-600">Xem thử ảnh:</span>
              <div className="relative h-24 w-24 overflow-hidden rounded-md border border-gray-200 bg-white">
                <Image
                  src={form.coverImage}
                  alt="Preview"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          )}

          {/* Bảng ảnh gallery */}
          <div className="mt-6 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">
                Ảnh sản phẩm (gallery)
              </h3>
              <button
                type="button"
                onClick={addImageRow}
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                + Thêm dòng ảnh
              </button>
            </div>
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-xs">
                <thead className="bg-gray-50 text-[11px] uppercase text-gray-500">
                  <tr>
                    <th className="px-2 py-1 text-left">URL ảnh</th>
                    <th className="px-2 py-1 text-left">Alt text</th>
                    <th className="px-2 py-1 text-center">Thứ tự</th>
                    <th className="px-2 py-1 text-center">Xoá</th>
                  </tr>
                </thead>
                <tbody>
                  {imageRows.map((img) => (
                    <tr key={img.id} className="border-t border-gray-100">
                    <td className="px-2 py-1">
                      <div className="flex gap-2">
                        <input
                          className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          value={img.url}
                          onChange={(e) =>
                            updateImageRow(img.id, {
                              url: e.target.value,
                            })
                          }
                          placeholder="https://..."
                        />
                        <button
                          type="button"
                          onClick={() => handleGalleryUploadClick(img.id)}
                          className="shrink-0 rounded border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                          disabled={
                            galleryUploadingId !== null &&
                            galleryUploadingId !== img.id
                          }
                        >
                          {galleryUploadingId === img.id
                            ? "Đang tải..."
                            : "Upload"}
                        </button>
                      </div>
                    </td>
                      <td className="px-2 py-1">
                        <input
                          className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          value={img.alt}
                          onChange={(e) =>
                            updateImageRow(img.id, {
                              alt: e.target.value,
                            })
                          }
                          placeholder="Mô tả ngắn cho ảnh"
                        />
                      </td>
                      <td className="px-2 py-1 text-center">
                        <input
                          type="number"
                          className="w-20 rounded border border-gray-300 px-2 py-1 text-xs text-center focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          value={img.sortOrder}
                          onChange={(e) =>
                            updateImageRow(img.id, {
                              sortOrder: e.target.value,
                            })
                          }
                          placeholder="Auto"
                        />
                      </td>
                      <td className="px-2 py-1 text-center">
                        <button
                          type="button"
                          onClick={() => removeImageRow(img.id)}
                          className="text-xs text-red-600 hover:underline disabled:text-gray-400"
                          disabled={imageRows.length <= 1}
                        >
                          Xoá
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
          </table>
              <input
                ref={galleryFileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleGalleryFileChange}
              />
        </div>
            <p className="text-[11px] text-gray-500">
              Ảnh đầu tiên sẽ được dùng làm ảnh mặc định nếu bạn không nhập
              &quot;Ảnh đại diện&quot; phía trên.
            </p>
          </div>

          {/* Bảng thông số kỹ thuật */}
          <div className="mt-6 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">
                Thông số kỹ thuật
              </h3>
              <button
                type="button"
                onClick={addSpecRow}
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                + Thêm dòng thông số
              </button>
            </div>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50 text-[11px] uppercase text-gray-500">
                  <tr>
                    <th className="px-2 py-1 text-left">Thông số</th>
                    <th className="px-2 py-1 text-left">Giá trị</th>
                    <th className="px-2 py-1 text-left">Đơn vị</th>
                    <th className="px-2 py-1 text-left">Ghi chú</th>
                    <th className="px-2 py-1 text-center">Xoá</th>
                  </tr>
                </thead>
                <tbody>
                  {specRows.map((s) => (
                    <tr key={s.id} className="border-t border-gray-100">
                      <td className="px-2 py-1">
                        {/* chọn spec có sẵn */}
                        <select
                          className="mb-1 w-full rounded border border-gray-300 px-2 py-1 text-[11px] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          value={s.definitionId || ""}
                          onChange={(e) => {
                            const defId = e.target.value || null;
                            const def = specDefs.find(
                              (d) => d.id === defId,
                            );
                            updateSpecRow(s.id, {
                              definitionId: defId,
                              name: def?.name || "",
                            });
                          }}
                        >
                          <option value="">
                            — Chọn thông số có sẵn —
                          </option>
                          {specDefs.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                        {/* hoặc gõ tên mới */}
                        <input
                          className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          value={s.name}
                          onChange={(e) =>
                            updateSpecRow(s.id, {
                              name: e.target.value,
                              // nếu tự sửa tên thì coi như không gắn với definitionId nữa
                              definitionId: undefined,
                            })
                          }
                          placeholder="VD: Chiều dài, Công suất motor..."
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          value={s.value}
                          onChange={(e) =>
                            updateSpecRow(s.id, {
                              value: e.target.value,
                            })
                          }
                          placeholder="VD: 800, 1.5, PVC trắng..."
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          value={s.unit}
                          onChange={(e) =>
                            updateSpecRow(s.id, {
                              unit: e.target.value,
                            })
                          }
                          placeholder="mm, kW, kg/m2..."
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          value={s.note}
                          onChange={(e) =>
                            updateSpecRow(s.id, {
                              note: e.target.value,
                            })
                          }
                          placeholder="Ghi chú thêm (nếu có)"
                        />
                      </td>
                      <td className="px-2 py-1 text-center">
                        <button
                          type="button"
                          onClick={() => removeSpecRow(s.id)}
                          className="text-xs text-red-600 hover:underline disabled:text-gray-400"
                          disabled={specRows.length <= 1}
                        >
                          Xoá
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-gray-500">
              Nếu chọn từ danh sách, thông số sẽ dùng lại definition sẵn có
              (tên thống nhất). Nếu gõ tên mới, hệ thống sẽ tự tạo definition
              mới khi lưu sản phẩm.
            </p>
          </div>
        </div>
      )}
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
        open={coverCropOpen && Boolean(coverCropSource?.url)}
        imageSrc={coverCropSource?.url ?? null}
        fileName={coverCropSource?.fileName}
        aspectRatio={4 / 3}
        onOpenChange={handleCoverDialogOpenChange}
        onComplete={handleCoverCropComplete}
      />
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
              {rowsToImport.length} sản phẩm ({rowsToImport.filter((d) => d.mode === "create").length} tạo mới,{" "}
              {rowsToImport.filter((d) => d.mode === "update").length} cập nhật).
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
