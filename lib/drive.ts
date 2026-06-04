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

  return google.drive({ version: "v3", auth });
}

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

export async function deleteDriveFile(fileId: string) {
  const drive = getDriveClient();
  await drive.files.delete({ fileId }).catch(() => {});
}

export async function ensureSolutionSubFolder(
  solutionId: string,
  subFolder: "cover" | "images",
) {
  const root = process.env.DRIVE_ROOT_SOLUTIONS;
  if (!root) throw new Error("Missing DRIVE_ROOT_SOLUTIONS");
  const solutionFolder = await ensureChildFolder(root, solutionId);
  return ensureChildFolder(solutionFolder, subFolder);
}

export async function ensureSoftwareSubFolder(
  softwareId: string,
  subFolder: "cover" | "images",
) {
  const root = process.env.DRIVE_ROOT_SOFTWARE;
  if (!root) throw new Error("Missing DRIVE_ROOT_SOFTWARE");
  const softwareFolder = await ensureChildFolder(root, softwareId);
  return ensureChildFolder(softwareFolder, subFolder);
}

export async function ensureUserFolder(userId: string) {
  const root = process.env.DRIVE_ROOT_USERS;
  if (!root) throw new Error("Missing DRIVE_ROOT_USERS");
  return ensureChildFolder(root, userId);
}

export async function ensureUserAvatarFolder(userId: string) {
  const userFolderId = await ensureUserFolder(userId);
  return ensureChildFolder(userFolderId, "avatar");
}

export async function uploadImageToDriveWebp(options: {
  buffer: Buffer;
  originalName: string;
  parentFolderId: string;
}) {
  const { buffer, originalName, parentFolderId } = options;
  const drive = getDriveClient();
  const webpBuffer = await sharp(buffer).webp({ quality: 85 }).toBuffer();
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

  return {
    fileId,
    publicUrl: `https://drive.google.com/uc?id=${fileId}`,
  };
}
