"use client";

const MAX_DIMENSION = 1000;
const TARGET_BYTES = 150 * 1024;
const MIN_QUALITY = 0.4;

async function encode(bitmap: ImageBitmap, width: number, height: number, quality: number): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, 0, width, height);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

// Phone-camera photos (e.g. Ghana Card ID shots) are routinely 3-10MB, and
// this deployment's network path has an unreliable ceiling somewhere in the
// low hundreds of KB for external uploads — so compress aggressively and
// step quality down further if the first pass still isn't small enough.
export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") return file;

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;

  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  let blob: Blob | null = null;
  for (let quality = 0.7; quality >= MIN_QUALITY; quality -= 0.15) {
    blob = await encode(bitmap, width, height, quality);
    if (blob && blob.size <= TARGET_BYTES) break;
  }
  if (!blob || blob.size >= file.size) return file;

  const name = file.name.replace(/\.\w+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg" });
}
