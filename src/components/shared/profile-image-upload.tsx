"use client";

import { useRef, useState, useTransition } from "react";
import { useSession } from "next-auth/react";
import { Camera, Loader2 } from "lucide-react";

interface ProfileImageUploadProps {
  currentImage?: string | null;
  name?: string | null;
  size?: number;
}

function getInitialsFallback(name: string | null | undefined) {
  if (!name?.trim()) return "?";
  return name.trim().split(" ").map((n) => n[0] ?? "").join("").toUpperCase().slice(0, 2) || "?";
}

export function ProfileImageUpload({ currentImage, name, size = 80 }: ProfileImageUploadProps) {
  const { update: updateSession } = useSession();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentImage ?? null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5 MB");
      return;
    }

    setError("");

    startTransition(async () => {
      // 1. Upload file
      const fd = new FormData();
      fd.append("file", file);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: fd });
      if (!uploadRes.ok) {
        const d = await uploadRes.json();
        setError(d.error ?? "Upload failed");
        return;
      }
      const { url } = await uploadRes.json();

      // 2. Save to user record
      const saveRes = await fetch("/api/profile/image", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: url }),
      });
      if (!saveRes.ok) {
        setError("Failed to save profile picture");
        return;
      }

      // 3. Refresh the session token so sidebar/avatar updates
      setPreview(url);
      await updateSession({ image: url });
    });

    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={isPending}
        className="relative group focus:outline-none"
        style={{ width: size, height: size }}
        aria-label="Change profile picture"
      >
        {/* Avatar circle */}
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt={name ?? "Profile"}
            className="rounded-full object-cover w-full h-full ring-4 ring-green-100"
          />
        ) : (
          <div
            className="rounded-full bg-green-600 flex items-center justify-center text-white font-bold ring-4 ring-green-100 w-full h-full"
            style={{ fontSize: size * 0.3 }}
          >
            {getInitialsFallback(name)}
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          {isPending ? (
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          ) : (
            <Camera className="h-6 w-6 text-white" />
          )}
        </div>
      </button>

      <p className="text-xs text-gray-400">Click to change photo</p>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}
