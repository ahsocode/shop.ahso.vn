// lib/drive.ts
import "server-only";
import { google } from "googleapis";
import sharp from "sharp";
import { Readable } from "stream";

const SCOPES = ["https://www.googleapis.com/auth/drive"];

function getDriveClient() {
  const clientEmail = process.env.DRIVE_CLIENT_EMAIL;
  const privateKey = process.env.DRIVE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!clientEmail || !privateKey) {
    throw new Error("Missing DRIVE_CLIENT_EMAIL or DRIVE_PRIVATE_KEY");
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: SCOPES,
  });

  const drive = google.drive({ version: "v3", auth });
  return drive;
}

/** Tạo folder con nếu chưa tồn tại, trả về folderId */
async function ensureChildFolder(parentId: string, name: string) {
  const drive = getDriveClient();

  const listRes = await drive.files.list({
    q: `'${parentId}' in parents and name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id, name)",
    pageSize: 1,
  });

  const existing = listRes.data.files?.[0];
  if (existing?.id) return existing.id;

  const createRes = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id",
  });

  if (!createRes.data.id) {
    throw new Error("Failed to create folder on Drive");
  }

  return createRes.data.id;
}

/** Set file public-read */
async function makeFilePublic(fileId: string) {
  const drive = getDriveClient();

  await drive.permissions.create({
    fileId,
    requestBody: {
      role: "reader",
      type: "anyone",
    },
  });
}

// /** Convert buffer → webp + upload lên Drive, trả fileId + publicUrl */
// export async function uploadImageToDriveWebp(options: {
//   buffer: Buffer;
//   originalName: string;
//   parentFolderId: string;
// }) {
//   const { buffer, originalName, parentFolderId } = options;
//   const drive = getDriveClient();

//   const webpBuffer = await sharp(buffer)
//     .webp({ quality: 85 })
//     .toBuffer();

//   const baseName = originalName.replace(/\.[^.]+$/, "") || "image";

//   const createRes = await drive.files.create({
//     requestBody: {
//       name: `${baseName}.webp`,
//       parents: [parentFolderId],
//       mimeType: "image/webp",
//     },
//     media: {
//       mimeType: "image/webp",
//       body: Readable.from(webpBuffer),
//     },
//     fields: "id",
//   });

//   const fileId = createRes.data.id;
//   if (!fileId) throw new Error("Failed to upload image to Drive");

//   await makeFilePublic(fileId);

//   const publicUrl = `https://drive.google.com/uc?id=${fileId}`;

//   return {
//     fileId,
//     publicUrl,
//   };
// }

/** Xoá file trên Drive */
export async function deleteDriveFile(fileId: string) {
  const drive = getDriveClient();
  await drive.files.delete({ fileId }).catch(() => {});
}

/** Lấy hoặc tạo folder theo productId + subfolder (vd: "images", "cover") */
export async function ensureProductSubFolder(
  productId: string,
  subFolder: "images" | "cover",
) {
  const rootProducts = process.env.DRIVE_ROOT_PRODUCTS;
  if (!rootProducts) throw new Error("Missing DRIVE_ROOT_PRODUCTS");

  const productFolderId = await ensureChildFolder(rootProducts, productId);
  const subFolderId = await ensureChildFolder(productFolderId, subFolder);

  return subFolderId;
}

/** Tương tự cho brand, category, producttype, solution, software, user */

export async function ensureBrandFolder(brandId: string) {
  const root = process.env.DRIVE_ROOT_BRANDS;
  if (!root) throw new Error("Missing DRIVE_ROOT_BRANDS");
  return ensureChildFolder(root, brandId);
}

export async function ensureCategoryFolder(categoryId: string) {
  const root = process.env.DRIVE_ROOT_PRODUCTCATEGORIES;
  if (!root) throw new Error("Missing DRIVE_ROOT_PRODUCTCATEGORIES");
  return ensureChildFolder(root, categoryId);
}



export async function ensureSolutionSubFolder(
  solutionId: string,
  subFolder: "cover" | "images",
) {
  const root = process.env.DRIVE_ROOT_SOLUTIONS;
  if (!root) throw new Error("Missing DRIVE_ROOT_SOLUTIONS");
  const solFolder = await ensureChildFolder(root, solutionId);
  return ensureChildFolder(solFolder, subFolder);
}

export async function ensureSoftwareSubFolder(
  softwareId: string,
  subFolder: "cover" | "images",
) {
  const root = process.env.DRIVE_ROOT_SOFTWARE;
  if (!root) throw new Error("Missing DRIVE_ROOT_SOFTWARE");
  const softFolder = await ensureChildFolder(root, softwareId);
  return ensureChildFolder(softFolder, subFolder);
}

export async function ensureUserFolder(userId: string) {
  const root = process.env.DRIVE_ROOT_USERS;
  if (!root) throw new Error("Missing DRIVE_ROOT_USERS");
  return ensureChildFolder(root, userId);
}

// 👇 NEW: folder avatar nằm trong folder user
export async function ensureUserAvatarFolder(userId: string) {
  const userFolderId = await ensureUserFolder(userId);      // /users/{userId}
  const avatarFolderId = await ensureChildFolder(userFolderId, "avatar"); // /users/{userId}/avatar
  return avatarFolderId;
}

export async function ensureProductTypeFolder(typeId: string) {
  const root = process.env.DRIVE_ROOT_PRODUCTTYPES;
  if (!root) throw new Error("Missing DRIVE_ROOT_PRODUCTTYPES");
  return ensureChildFolder(root, typeId);
}

// 👇 NEW: cover của producttype
export async function ensureProductTypeCoverFolder(typeId: string) {
  const ptFolderId = await ensureProductTypeFolder(typeId);
  const coverFolderId = await ensureChildFolder(ptFolderId, "cover");
  return coverFolderId;
}

export async function uploadImageToDriveWebp(options: {
  buffer: Buffer;
  originalName: string;
  parentFolderId: string;
}) {
  const { buffer, originalName, parentFolderId } = options;
  const drive = getDriveClient();

  // nếu nghi do sharp lỗi thì tạm thời bỏ 3 dòng này, upload buffer gốc
  const webpBuffer = await sharp(buffer)
    .webp({ quality: 85 })
    .toBuffer();

  const baseName = originalName.replace(/\.[^.]+$/, "") || "image";

  const createRes = await drive.files.create({
    requestBody: {
      name: `${baseName}.webp`,
      parents: [parentFolderId],
      mimeType: "image/webp",
    },
    media: {
      mimeType: "image/webp",
      body: Readable.from(webpBuffer),
    },
    fields: "id",
  });

  const fileId = createRes.data.id;
  if (!fileId) throw new Error("Failed to upload image to Drive");

  await makeFilePublic(fileId);

  const publicUrl = `https://drive.google.com/uc?id=${fileId}`;
  return { fileId, publicUrl };
}