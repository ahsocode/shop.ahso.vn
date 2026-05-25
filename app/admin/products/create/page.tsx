"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ImageCropDialog } from "@/components/image/image-crop-dialog";
import { getJSON, postJSON, makeHeaders } from "../../_lib/fetcher";
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
  status: "PUBLISHED" as "DRAFT" | "PUBLISHED" | "ARCHIVED",
  description: "",
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
  const [searchQuery] = useState("");
  const [page] = useState(1);
  const [rows, setRows] = useState<Row[]>([]);
  const [, setTotal] = useState(0);
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
  const [specDefs, setSpecDefs] = useState<SpecDefOption[]>([]); // ⬅️ danh sách spec có sẵn

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [creating, setCreating] = useState(false);
  const [, setLoadingList] = useState(false);

  // bảng thông số kỹ thuật
  const [specRows, setSpecRows] = useState<SpecRow[]>([
    { id: 1, name: "", value: "", unit: "", note: "" },
  ]);

  // bảng ảnh gallery
  const [imageRows, setImageRows] = useState<ImageRow[]>([
    { id: 1, url: "", alt: "", sortOrder: "" },
  ]);
  const selectAllRef = useRef<HTMLInputElement | null>(null);
  const galleryFileInputRef = useRef<HTMLInputElement | null>(null);
  const [galleryCropOpen, setGalleryCropOpen] = useState(false);
  const [galleryCropSource, setGalleryCropSource] = useState<{
    url: string;
    fileName: string;
    revokeOnClose: boolean;
  } | null>(null);
  const [galleryTargetId, setGalleryTargetId] = useState<number | null>(null);
  const [galleryUploadingId, setGalleryUploadingId] = useState<number | null>(null);
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
  const [, setPreviewLoading] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importSelection, setImportSelection] = useState<"all" | "selected">("all");
  const [importProgress, setImportProgress] = useState<{
    step: "commit" | "upload_images";
    current: number;
    total: number;
  } | null>(null);
  const [importIntent, setImportIntent] = useState<ImportIntent | null>(null);
  const [importConfirmOpen, setImportConfirmOpen] = useState(false);
  const [defaultBrand] = useState("");
  const [defaultType] = useState("");
  const [defaultSupplier] = useState("");
  const bulkFileInputRef = useRef<HTMLInputElement | null>(null);
  const [filterBrand] = useState("");
  const [filterType] = useState("");
  const [sortKey] = useState("updatedAt_desc");
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

  const openGalleryPicker = () => {
    if (!ensureUploadPrerequisites()) return;
    setGalleryTargetId(imageRows[0]?.id ?? null);
    galleryFileInputRef.current?.click();
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

  const bulkImageInputRef = useRef<HTMLInputElement | null>(null);
  const releaseBulkPreviews = (urls: string[]) => {
    urls.forEach((url) => URL.revokeObjectURL(url));
  };

  useEffect(() => {
    return () => {
      releaseBulkPreviews(bulkImage.files.map((item) => item.preview));
    };
  }, [bulkImage.files]);

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

  const resetForm = () => {
    setForm({
      ...DEFAULT_FORM,
      typeId: types[0]?.id || "",
    });
    setSpecRows([{ id: 1, name: "", value: "", unit: "", note: "" }]);
    setImageRows([{ id: 1, url: "", alt: "", sortOrder: "" }]);
    setCoverImageId(null);
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

      const coverFromRows =
        imageRows.find((img) => img.id === coverImageId && img.url.trim())?.url ||
        imageRows.find((img) => img.url.trim())?.url ||
        undefined;

      const priceValue = parseNumber(form.price) ?? 0;
      const stockValue = parseNumber(form.stockOnHand) ?? 0;

      if (!form.requiresQuote && priceValue <= 0) {
        toast.error("Giá bán phải lớn hơn 0 khi không chọn báo giá.");
        return;
      }
      if (stockValue <= 0) {
        toast.error("Tồn kho ban đầu phải lớn hơn 0.");
        return;
      }

      await postJSON("/api/admin/products", {
        name: form.name.trim(),
        sku: form.sku.trim(),
        slug: form.slug.trim() || undefined,
        typeId: form.typeId,
        brandId: form.brandId || undefined,
        supplierId: form.supplierId || undefined,
        supplierSku: form.supplierSku.trim() || undefined,
        price: form.requiresQuote ? 0 : priceValue,
        listPrice: parseNumber(form.listPrice),
        costPrice: parseNumber(form.costPrice),
        currency: form.currency || "VND",
        requiresQuote: form.requiresQuote,
        quoteNote: form.quoteNote.trim() || undefined,
        stockOnHand: stockValue,
        reorderLevel: parseNumber(form.reorderLevel),
        minOrderQty: parseNumber(form.minOrderQty),
        coverImage: coverFromRows,
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

  const priceValue = toNumberOrNull(form.price) ?? 0;
  const stockValue = toNumberOrNull(form.stockOnHand) ?? 0;
  const canSubmit = Boolean(
    form.name.trim() &&
      form.sku.trim() &&
      form.typeId &&
      (form.requiresQuote || priceValue > 0) &&
      stockValue > 0,
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

    setGalleryUploadingId(files.length === 1 && galleryTargetId ? galleryTargetId : -1);
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
      if (coverImageId === null && rows.length) {
        setCoverImageId(rows[0].id);
      }
      toast.success(`Đã tải ${files.length} ảnh`);
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      setGalleryUploadingId(null);
      setGalleryTargetId(null);
    }
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

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 border-b border-gray-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Tạo sản phẩm mới</h1>
              <p className="text-xs text-gray-500">
                Điền đầy đủ thông tin cơ bản, giá bán và tồn kho. Hệ thống tự tạo slug nếu bỏ trống.
              </p>
              <div className="mt-2 text-[11px] text-gray-400">
                Trường có dấu <span className="text-red-500">*</span> là bắt buộc.
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/admin/products/list"
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
              >
                Quay lại danh sách
              </Link>
              <button
                onClick={resetForm}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
              >
                Làm mới
              </button>
              <button
                onClick={handleCreate}
                disabled={!canSubmit || creating}
                className="inline-flex items-center rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creating ? "Đang lưu..." : "Lưu sản phẩm"}
              </button>
            </div>
          </div>

          {/* ==== FORM CHÍNH ==== */}
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-gray-800">Thông tin sản phẩm</h2>
              <span className="text-[11px] text-gray-400">Bước 1/2</span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
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
                min="1"
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

            <div className="space-y-2">
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
                min="1"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={form.stockOnHand}
                onChange={(e) =>
                  setForm({ ...form, stockOnHand: e.target.value })
                }
                placeholder="1"
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
                Ảnh sản phẩm (gallery) & chọn ảnh đại diện
              </h3>
              <button
                type="button"
                onClick={openGalleryPicker}
                className="rounded border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
              >
                Tải ảnh (nhiều file)
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => fetchLibrary(undefined, { mode: "single" })}
                className="rounded border border-gray-300 bg-white px-3 py-1.5 font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                Chọn từ thư viện (theo loại sản phẩm)
              </button>
              <button
                type="button"
                onClick={addImageRow}
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                + Thêm dòng trống
              </button>
              <span className="text-gray-500">
                Chọn 1 ảnh làm cover bằng nút &quot;Đặt cover&quot; hoặc dấu chọn.
              </span>
            </div>
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-xs">
                <thead className="bg-gray-50 text-[11px] uppercase text-gray-500">
                  <tr>
                    <th className="px-2 py-1 text-left">URL ảnh</th>
                    <th className="px-2 py-1 text-center">Cover</th>
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
                      <td className="px-2 py-1 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <input
                            type="radio"
                            name="cover-image"
                            className="h-4 w-4"
                            checked={coverImageId === img.id}
                            onChange={() => setCoverImageId(img.id)}
                            disabled={!img.url.trim()}
                          />
                          {coverImageId === img.id ? (
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-800">
                              Cover
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="text-[11px] text-blue-600 hover:underline disabled:opacity-50"
                              onClick={() => setCoverImageId(img.id)}
                              disabled={!img.url.trim()}
                            >
                              Đặt cover
                            </button>
                          )}
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
              Chọn 1 ảnh làm cover. Bạn có thể tải nhiều ảnh cùng lúc hoặc chọn từ thư viện của loại sản phẩm.
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
