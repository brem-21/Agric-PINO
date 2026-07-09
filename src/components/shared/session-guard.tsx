"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface SessionGuardProps {
  /** Roles allowed to view this section. */
  expectedRoles: string[];
  /** Also allow through if the session's isVendor flag is set (vendor section). */
  allowVendorFlag?: boolean;
}

/**
 * Re-checks the session whenever the tab regains focus/visibility and, if the
 * role no longer matches, triggers a server re-render — this is what catches
 * a stale privileged view left open in one tab after the account was
 * switched in another (the server-side auth() check in the layout still owns
 * the actual access decision; this just stops it from being skipped).
 */
export function SessionGuard({ expectedRoles, allowVendorFlag }: SessionGuardProps) {
  const router = useRouter();

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" });
        const session = await res.json();
        const role = session?.user?.role as string | undefined;
        const isVendor = session?.user?.isVendor as boolean | undefined;
        const ok = (role && expectedRoles.includes(role)) || (allowVendorFlag && isVendor);
        if (!ok) router.refresh();
      } catch {
        // Network hiccup — don't punish the user for a failed background check.
      }
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible") check();
    }

    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [expectedRoles, allowVendorFlag, router]);

  return null;
}
