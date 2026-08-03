"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft } from "lucide-react";
import { getDashboardPath } from "@/lib/dashboard-path";
import { cn } from "@/lib/utils";

interface BackButtonProps {
  className?: string;
  iconOnly?: boolean;
}

// Goes back to wherever the user actually came from (browser history) when there is
// somewhere to go back to; otherwise falls back to their dashboard (or the landing
// page if signed out) — for pages like Marketplace that are reachable from
// many different places and don't have a single "correct" parent route.
export function BackButton({ className, iconOnly = false }: BackButtonProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(getDashboardPath(role));
    }
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      aria-label="Go back"
      title="Go back"
      className={cn(
        "flex items-center gap-1.5 rounded-full border border-[#eeeee9] text-[#1c3a13] hover:bg-[#eeeee9] hover:border-[#1c3a13] transition-colors flex-shrink-0",
        iconOnly ? "h-9 w-9 justify-center" : "px-3 py-1.5 text-sm font-medium",
        className
      )}
    >
      <ArrowLeft className="h-4 w-4" />
      {!iconOnly && "Back"}
    </button>
  );
}
