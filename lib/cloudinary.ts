"use server";

import { createHash } from "crypto";
import { slugify } from "@/lib/slug";

type CloudinaryConfig = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  avatarPreset?: string | null;
  productGalleryPreset?: string | null;
  productCoverPreset?: string | null;
  brandPreset?: string | null;
  categoryPreset?: string | null;
  productTypePreset?: string | null;
  heroBannerPreset?: string | null;
  popupBannerPreset?: string | null;
};

type UploadResult = {
  publicId: string;
  secureUrl: string;
};

type UploadOptions = {
  buffer: Buffer;
  folder: string;
  uploadPreset?: string | null;
  fileName?: string;
  publicId?: string;
};

let cachedConfig: CloudinaryConfig | null = null;

function getConfig(): CloudinaryConfig {
  if (cachedConfig) return cachedConfig;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const avatarPreset = process.env.CLOUDINARY_AVATAR_PRESET;
  const productGalleryPreset = process.env.CLOUDINARY_PRODUCT_PRESET;
  const productCoverPreset = process.env.CLOUDINARY_PRODUCT_COVER_PRESET;
  const brandPreset = process.env.CLOUDINARY_BRAND_PRESET;
  const categoryPreset = process.env.CLOUDINARY_CATEGORY_PRESET;
  const productTypePreset = process.env.CLOUDINARY_PRODUCT_TYPE_PRESET;
  const heroBannerPreset = process.env.CLOUDINARY_HERO_BANNER_PRESET;
  const popupBannerPreset = process.env.CLOUDINARY_POPUP_BANNER_PRESET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Missing Cloudinary credentials");
  }

  cachedConfig = {
    cloudName,
    apiKey,
    apiSecret,
    avatarPreset: avatarPreset || null,
    productGalleryPreset: productGalleryPreset || null,
    productCoverPreset: productCoverPreset || null,
    brandPreset: brandPreset || null,
    categoryPreset: categoryPreset || null,
    productTypePreset: productTypePreset || null,
    heroBannerPreset: heroBannerPreset || null,
    popupBannerPreset: popupBannerPreset || null,
  };

  return cachedConfig;
}

export async function uploadAvatarToCloudinary(options: {
  buffer: Buffer;
  userId: string;
}): Promise<UploadResult> {
  const config = getConfig();
  return uploadBuffer({
    buffer: options.buffer,
    folder: "avatars",
    publicId: options.userId,
    uploadPreset: config.avatarPreset,
  });
}

export async function uploadProductImageToCloudinary(options: {
  buffer: Buffer;
  productId: string;
  sku: string;
  categorySlug?: string | null;
  productTypeSlug?: string | null;
  fileName?: string;
  type: "cover" | "gallery";
  sequence?: number;
}): Promise<UploadResult> {
  const config = getConfig();

  const categorySegment = sanitizeSegment(options.categorySlug, "uncategorized");
  const typeSegment = sanitizeSegment(options.productTypeSlug, "general");
  const skuSegment = sanitizeSegment(options.sku, options.productId);

  const baseFolder = `categories/${categorySegment}/${typeSegment}/${skuSegment}`;
  const folder =
    options.type === "cover" ? `${baseFolder}/cover` : `${baseFolder}/gallery`;
  const publicId =
    options.type === "cover"
      ? `cover-${skuSegment}`
      : options.sequence !== undefined
      ? `${skuSegment}-${options.sequence}`
      : undefined;

  return uploadBuffer({
    buffer: options.buffer,
    folder,
    fileName: options.fileName,
    publicId,
    uploadPreset:
      options.type === "cover" ? config.productCoverPreset : config.productGalleryPreset,
  });
}

export async function uploadBrandLogoToCloudinary(options: {
  buffer: Buffer;
  brandId: string;
}): Promise<UploadResult> {
  const config = getConfig();
  return uploadBuffer({
    buffer: options.buffer,
    folder: "brands/logos",
    publicId: options.brandId,
    uploadPreset: config.brandPreset,
  });
}

export async function uploadHeroBannerImage(options: {
  buffer: Buffer;
  fileName?: string;
}): Promise<UploadResult> {
  const config = getConfig();
  return uploadBuffer({
    buffer: options.buffer,
    folder: "hero_banner",
    fileName: options.fileName,
    uploadPreset: config.heroBannerPreset,
  });
}

export async function uploadPopupBannerImage(options: {
  buffer: Buffer;
  fileName?: string;
}): Promise<UploadResult> {
  const config = getConfig();
  return uploadBuffer({
    buffer: options.buffer,
    folder: "popup_banner",
    fileName: options.fileName,
    uploadPreset: config.popupBannerPreset,
  });
}

export async function uploadCategoryCoverToCloudinary(options: {
  buffer: Buffer;
  categoryId: string;
  categorySlug?: string | null;
}): Promise<UploadResult> {
  const config = getConfig();
  const categorySegment = sanitizeSegment(options.categorySlug, options.categoryId);
  return uploadBuffer({
    buffer: options.buffer,
    folder: `categories/${categorySegment}/cover`,
    publicId: `cover-${categorySegment}`,
    uploadPreset: config.categoryPreset,
  });
}

export async function uploadProductTypeCoverToCloudinary(options: {
  buffer: Buffer;
  productTypeId: string;
  productTypeSlug?: string | null;
  categorySlug?: string | null;
}): Promise<UploadResult> {
  const config = getConfig();
  const categorySegment = sanitizeSegment(options.categorySlug, "uncategorized");
  const typeSegment = sanitizeSegment(options.productTypeSlug, options.productTypeId);
  return uploadBuffer({
    buffer: options.buffer,
    folder: `categories/${categorySegment}/${typeSegment}/cover`,
    publicId: `cover-${typeSegment}`,
    uploadPreset: config.productTypePreset,
  });
}

async function uploadBuffer(options: UploadOptions): Promise<UploadResult> {
  const config = getConfig();

  const timestamp = Math.floor(Date.now() / 1000);
  const publicIdBase =
    options.publicId ??
    options.fileName?.replace(/\.[^.]+$/, "") ??
    `image-${timestamp}`;

  const params: Record<string, string> = {
    folder: options.folder,
    public_id: publicIdBase,
    timestamp: timestamp.toString(),
    overwrite: "true",
    invalidate: "true",
  };

  if (options.uploadPreset) {
    params.upload_preset = options.uploadPreset;
  }

  const signature = signParams(params, config.apiSecret);

  const formData = new FormData();
  const blob = new Blob([new Uint8Array(options.buffer)], {
    type: "image/webp",
  });
  formData.append("file", blob, `${publicIdBase}.webp`);
  formData.append("api_key", config.apiKey);

  Object.entries(params).forEach(([key, value]) => {
    formData.append(key, value);
  });

  formData.append("signature", signature);

  const endpoint = `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`;
  const res = await fetch(endpoint, {
    method: "POST",
    body: formData,
  });

  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    const errorMsg =
      (payload as { error?: { message?: string } } | null)?.error?.message ||
      "Failed to upload image to Cloudinary";
    throw new Error(errorMsg);
  }

  const data = payload as { public_id: string; secure_url: string };

  return {
    publicId: data.public_id,
    secureUrl: data.secure_url,
  };
}

function signParams(params: Record<string, string>, apiSecret: string) {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  return createHash("sha1")
    .update(`${toSign}${apiSecret}`)
    .digest("hex");
}

function sanitizeSegment(value: string | null | undefined, fallback: string) {
  if (!value) return fallback;
  const slug = slugify(value);
  return slug || fallback;
}

export type CloudinaryAsset = {
  assetId: string;
  publicId: string;
  secureUrl: string;
  width: number;
  height: number;
  bytes: number;
  createdAt: string;
};

export type BrandLogoAsset = CloudinaryAsset;

type ListAssetsOptions = {
  nextCursor?: string | null;
  maxResults?: number;
  folder: string;
};

async function listAssetsByFolder(
  options: ListAssetsOptions,
): Promise<{ items: CloudinaryAsset[]; nextCursor: string | null }> {
  const config = getConfig();
  const endpoint = `https://api.cloudinary.com/v1_1/${config.cloudName}/resources/search`;

  const maxResults = Math.min(Math.max(options?.maxResults ?? 30, 1), 100);
  const body: Record<string, unknown> = {
    expression: `folder:"${options.folder}"`,
    max_results: maxResults,
    sort_by: [{ created_at: "desc" }],
  };
  if (options?.nextCursor) {
    body.next_cursor = options.nextCursor;
  }

  const auth = Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString("base64");
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = (await res.json().catch(() => null)) as CloudinarySearchResponse | null;
  if (!res.ok || !payload) {
    const message = payload?.error?.message || "Failed to fetch Cloudinary resources";
    throw new Error(message);
  }

  const resources = payload.resources ?? [];
  const items: CloudinaryAsset[] = resources.map((item) => ({
    assetId: item.asset_id,
    publicId: item.public_id,
    secureUrl: item.secure_url,
    width: item.width,
    height: item.height,
    bytes: item.bytes,
    createdAt: item.created_at,
  }));

  return {
    items,
    nextCursor: payload.next_cursor ?? null,
  };
}

export async function listBrandLogosFromCloudinary(options?: {
  nextCursor?: string | null;
  maxResults?: number;
}) {
  return listAssetsByFolder({
    folder: "brands/logos",
    nextCursor: options?.nextCursor ?? null,
    maxResults: options?.maxResults,
  });
}

export async function listHeroBannerAssets(options?: {
  nextCursor?: string | null;
  maxResults?: number;
}) {
  return listAssetsByFolder({
    folder: "hero_banner",
    nextCursor: options?.nextCursor ?? null,
    maxResults: options?.maxResults,
  });
}

export async function listPopupBannerAssets(options?: {
  nextCursor?: string | null;
  maxResults?: number;
}) {
  return listAssetsByFolder({
    folder: "popup_banner",
    nextCursor: options?.nextCursor ?? null,
    maxResults: options?.maxResults,
  });
}

type CloudinarySearchResponse = {
  resources?: Array<{
    asset_id: string;
    public_id: string;
    secure_url: string;
    width: number;
    height: number;
    bytes: number;
    created_at: string;
  }>;
  next_cursor?: string;
  error?: { message?: string };
};
