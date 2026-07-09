import { v2 as cloudinary } from "cloudinary";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif"];

export async function saveUploadedFile(file: File, folder = "uploads"): Promise<string> {
  if (!ALLOWED.includes(file.type)) {
    throw new Error("Only JPEG, PNG, WebP and AVIF images are allowed");
  }
  if (file.size > MAX_SIZE) {
    throw new Error("File too large (max 5 MB)");
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `lorgric/${folder}`, resource_type: "image" },
      (error, uploadResult) => {
        if (error || !uploadResult) return reject(error ?? new Error("Cloudinary upload failed"));
        resolve(uploadResult);
      }
    );
    stream.end(buffer);
  });

  return result.secure_url;
}
