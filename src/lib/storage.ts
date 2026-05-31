import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

function isS3Configured(): boolean {
  return !!(
    process.env.S3_BUCKET &&
    process.env.S3_ACCESS_KEY_ID &&
    process.env.S3_SECRET_ACCESS_KEY
  );
}

function getS3Client() {
  return new S3Client({
    region: process.env.S3_REGION ?? "auto",
    endpoint: process.env.S3_ENDPOINT || undefined,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: !!process.env.S3_ENDPOINT,
  });
}

function publicUrlForKey(key: string): string {
  if (process.env.S3_PUBLIC_URL) {
    return `${process.env.S3_PUBLIC_URL.replace(/\/$/, "")}/${key}`;
  }
  const bucket = process.env.S3_BUCKET!;
  const region = process.env.S3_REGION ?? "auto";
  if (process.env.S3_ENDPOINT) {
    return `${process.env.S3_ENDPOINT.replace(/\/$/, "")}/${bucket}/${key}`;
  }
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

export async function storeFile(params: {
  userId: string;
  purpose: string;
  filename: string;
  mimeType: string;
  buffer: Buffer;
}): Promise<string> {
  if (!ALLOWED.has(params.mimeType)) {
    throw new Error("File type not allowed");
  }
  if (params.buffer.length > MAX_SIZE) {
    throw new Error("File too large (max 5MB)");
  }

  const ext = path.extname(params.filename) || ".bin";
  const key = `uploads/${params.userId}/${params.purpose}-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;

  if (isS3Configured()) {
    const client = getS3Client();
    await client.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: key,
        Body: params.buffer,
        ContentType: params.mimeType,
      })
    );
    return publicUrlForKey(key);
  }

  const stored = `${params.userId}-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, stored), params.buffer);
  return `/uploads/${stored}`;
}
