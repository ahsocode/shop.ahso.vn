"use server";

import { createHash } from "crypto";
import { slugify } from "@/lib/slug";

type CloudinaryConfig = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  avatarPreset?: string | null;
  softwareCoverPreset?: string | null;
  solutionCoverPreset?: string | null;
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

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Missing Cloudinary credentials");
  }

  cachedConfig = {
    cloudName,
    apiKey,
    apiSecret,
    avatarPreset: process.env.CLOUDINARY_AVATAR_PRESET || null,
    heroBannerPreset: process.env.CLOUDINARY_HERO_BANNER_PRESET || null,
    popupBannerPreset: process.env.CLOUDINARY_POPUP_BANNER_PRESET || null,
    softwareCoverPreset: process.env.CLOUDINARY_SOFTWARE_COVER_PRESET || null,
    solutionCoverPreset: process.env.CLOUDINARY_SOLUTION_COVER_PRESET || null,
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

export async function uploadSoftwareCoverToCloudinary(options: {
  buffer: Buffer;
  fileName?: string;
}): Promise<UploadResult> {
  const config = getConfig();
  const fileBase = sanitizeSegment(options.fileName?.replace(/\.[^.]+$/, ""), "software");
  return uploadBuffer({
    buffer: options.buffer,
    folder: "software/cover",
    fileName: options.fileName,
    publicId: `${fileBase}-${Date.now()}`,
    uploadPreset: config.softwareCoverPreset,
  });
}

export async function uploadSolutionCoverToCloudinary(options: {
  buffer: Buffer;
  fileName?: string;
}): Promise<UploadResult> {
  const config = getConfig();
  const fileBase = sanitizeSegment(options.fileName?.replace(/\.[^.]+$/, ""), "solution");
  return uploadBuffer({
    buffer: options.buffer,
    folder: "solutions/cover",
    fileName: options.fileName,
    publicId: `${fileBase}-${Date.now()}`,
    uploadPreset: config.solutionCoverPreset,
  });
}

export async function uploadSoftwareGalleryToCloudinary(options: {
  buffer: Buffer;
  fileName?: string;
}): Promise<UploadResult> {
  const fileBase = sanitizeSegment(options.fileName?.replace(/\.[^.]+$/, ""), "software");
  return uploadBuffer({
    buffer: options.buffer,
    folder: "software/gallery",
    fileName: options.fileName,
    publicId: `${fileBase}-${Date.now()}`,
  });
}

export async function uploadSolutionGalleryToCloudinary(options: {
  buffer: Buffer;
  fileName?: string;
}): Promise<UploadResult> {
  const fileBase = sanitizeSegment(options.fileName?.replace(/\.[^.]+$/, ""), "solution");
  return uploadBuffer({
    buffer: options.buffer,
    folder: "solutions/gallery",
    fileName: options.fileName,
    publicId: `${fileBase}-${Date.now()}`,
  });
}

export async function uploadContentEditorImageToCloudinary(options: {
  buffer: Buffer;
  fileName?: string;
}): Promise<UploadResult> {
  const fileBase = sanitizeSegment(options.fileName?.replace(/\.[^.]+$/, ""), "content-image");
  return uploadBuffer({
    buffer: options.buffer,
    folder: "content/editor",
    fileName: options.fileName,
    publicId: `${fileBase}-${Date.now()}`,
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
  Object.entries(params).forEach(([key, value]) => formData.append(key, value));
  formData.append("signature", signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`, {
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

type ListAssetsOptions = {
  nextCursor?: string | null;
  maxResults?: number;
  folder: string;
};

type DestroyResult = {
  publicId: string;
  result: string;
};

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

async function listAssetsByFolder(
  options: ListAssetsOptions,
): Promise<{ items: CloudinaryAsset[]; nextCursor: string | null }> {
  const config = getConfig();
  const maxResults = Math.min(Math.max(options.maxResults ?? 30, 1), 100);
  const body: Record<string, unknown> = {
    expression: `folder:"${options.folder}"`,
    max_results: maxResults,
    sort_by: [{ created_at: "desc" }],
  };

  if (options.nextCursor) {
    body.next_cursor = options.nextCursor;
  }

  const auth = Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString("base64");
  const res = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/resources/search`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = (await res.json().catch(() => null)) as CloudinarySearchResponse | null;
  if (!res.ok || !payload) {
    throw new Error(payload?.error?.message || "Failed to fetch Cloudinary resources");
  }

  return {
    items: (payload.resources ?? []).map((item) => ({
      assetId: item.asset_id,
      publicId: item.public_id,
      secureUrl: item.secure_url,
      width: item.width,
      height: item.height,
      bytes: item.bytes,
      createdAt: item.created_at,
    })),
    nextCursor: payload.next_cursor ?? null,
  };
}

async function destroyCloudinaryAsset(publicId: string, invalidate = true) {
  const config = getConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const params: Record<string, string> = {
    public_id: publicId,
    timestamp: String(timestamp),
    invalidate: invalidate ? "true" : "false",
  };
  const signature = signParams(params, config.apiSecret);
  const formData = new FormData();

  formData.append("api_key", config.apiKey);
  Object.entries(params).forEach(([key, value]) => formData.append(key, value));
  formData.append("signature", signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/image/destroy`, {
    method: "POST",
    body: formData,
  });
  const payload = (await res.json().catch(() => null)) as {
    result?: string;
    error?: { message?: string };
  } | null;

  if (!res.ok || !payload) {
    throw new Error(payload?.error?.message || "Failed to delete Cloudinary asset");
  }

  return payload.result ?? "unknown";
}

export async function deleteCloudinaryAssets(options: {
  publicIds: string[];
  invalidate?: boolean;
}): Promise<{ results: DestroyResult[] }> {
  const results: DestroyResult[] = [];
  for (const publicId of options.publicIds) {
    const result = await destroyCloudinaryAsset(publicId, options.invalidate);
    results.push({ publicId, result });
  }
  return { results };
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

export async function listSoftwareGalleryAssets(options?: {
  nextCursor?: string | null;
  maxResults?: number;
}) {
  return listAssetsByFolder({
    folder: "software/gallery",
    nextCursor: options?.nextCursor ?? null,
    maxResults: options?.maxResults,
  });
}

export async function listSolutionGalleryAssets(options?: {
  nextCursor?: string | null;
  maxResults?: number;
}) {
  return listAssetsByFolder({
    folder: "solutions/gallery",
    nextCursor: options?.nextCursor ?? null,
    maxResults: options?.maxResults,
  });
}

export async function listContentEditorAssets(options?: {
  nextCursor?: string | null;
  maxResults?: number;
}) {
  return listAssetsByFolder({
    folder: "content/editor",
    nextCursor: options?.nextCursor ?? null,
    maxResults: options?.maxResults,
  });
}
