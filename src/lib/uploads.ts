import { prisma } from "./db";
import { storeFile } from "./storage";

export async function saveUpload(params: {
  userId: string;
  purpose: string;
  filename: string;
  mimeType: string;
  buffer: Buffer;
}) {
  const url = await storeFile(params);
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
