"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface SessionGuardProps {
  /** Roles allowed to view this section. */
  expectedRoles: string[];
  /** Also allow through if this boolean session flag is true (e.g. isIncidentTeam) — for access gated by an add-on capability rather than the primary role. */
  expectedFlag?: "isIncidentTeam";
}

/**
 * Re-checks the session whenever the tab regains focus/visibility and, if the
 * role no longer matches, triggers a server re-render — this is what catches
 * a stale privileged view left open in one tab after the account was
 * switched in another (the server-side auth() check in the layout still owns
 * the actual access decision; this just stops it from being skipped).
 */
export function SessionGuard({ expectedRoles, expectedFlag }: SessionGuardProps) {
  const router = useRouter();

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" });
        const session = await res.json();
        const role = session?.user?.role as string | undefined;
        const flagOk = expectedFlag ? session?.user?.[expectedFlag] === true : false;
        const ok = (role && expectedRoles.includes(role)) || flagOk;
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
  }, [expectedRoles, expectedFlag, router]);

  return null;
}
