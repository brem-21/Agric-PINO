import { writeFile } from "fs/promises";
import { join } from "path";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif"];

export async function saveUploadedFile(file: File): Promise<string> {
  if (!ALLOWED.includes(file.type)) {
    throw new Error("Only JPEG, PNG, WebP and AVIF images are allowed");
  }
  if (file.size > MAX_SIZE) {
    throw new Error("File too large (max 5 MB)");
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const uploadDir = join(process.cwd(), "public", "uploads");
  await writeFile(join(uploadDir, filename), buffer);

  return `/uploads/${filename}`;
}
