import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "./db";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

export async function saveUpload(params: {
  userId: string;
  purpose: string;
  filename: string;
  mimeType: string;
  buffer: Buffer;
}) {
  if (!ALLOWED.has(params.mimeType)) {
    throw new Error("File type not allowed");
  }
  if (params.buffer.length > MAX_SIZE) {
    throw new Error("File too large (max 5MB)");
  }

  const ext = path.extname(params.filename) || ".bin";
  const stored = `${params.userId}-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, stored), params.buffer);

  const url = `/uploads/${stored}`;
  return prisma.uploadedFile.create({
    data: {
      userId: params.userId,
      filename: params.filename,
      mimeType: params.mimeType,
      url,
      purpose: params.purpose,
    },
  });
}
