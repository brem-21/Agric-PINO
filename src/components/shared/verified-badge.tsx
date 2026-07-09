"use client";

import { CheckCircle2 } from "lucide-react";

interface VerifiedBadgeProps {
  verifiedAt?: string | null;
  size?: "sm" | "md";
}

export function VerifiedBadge({ verifiedAt, size = "md" }: VerifiedBadgeProps) {
  if (!verifiedAt) return null;

  const formattedDate = new Date(verifiedAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <span className="group relative inline-flex items-center">
      <CheckCircle2
        className={`${iconSize} text-[#1c3a13] cursor-default`}
        aria-label="Verified user"
      />
      <span className="pointer-events-none absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#d3fa99] px-2 py-1 text-xs text-[#1c3a13] opacity-0 transition-opacity group-hover:opacity-100 z-50">
        Verified on {formattedDate}
      </span>
    </span>
  );
}
