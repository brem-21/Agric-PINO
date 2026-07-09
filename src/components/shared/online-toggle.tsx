"use client";

import { useState, useEffect } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { RIDER_OFFLINE_KEY } from "./presence-tracker";

interface OnlineToggleProps {
  className?: string;
  iconOnly?: boolean;
}

export function OnlineToggle({ className = "", iconOnly = false }: OnlineToggleProps) {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    try {
      setOffline(localStorage.getItem(RIDER_OFFLINE_KEY) === "true");
    } catch {
      // ignore
    }
  }, []);

  function toggle() {
    const next = !offline;
    try {
      localStorage.setItem(RIDER_OFFLINE_KEY, String(next));
    } catch {
      // ignore
    }
    setOffline(next);
    window.dispatchEvent(new CustomEvent("lorgric:offline-toggle"));
  }

  return (
    <button
      onClick={toggle}
      title={offline ? "You are offline — click to go online" : "You are online — click to go offline"}
      className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition-colors ${
        offline
          ? "bg-red-900/40 text-red-300 hover:bg-red-900/60"
          : "bg-[#d3fa99]/20 text-[#fcfcf7] hover:bg-[#d3fa99]/30"
      } ${className}`}
    >
      {offline ? (
        <>
          <WifiOff className="h-3.5 w-3.5" />
          {!iconOnly && "Offline"}
        </>
      ) : (
        <>
          <Wifi className="h-3.5 w-3.5" />
          {!iconOnly && "Online"}
        </>
      )}
    </button>
  );
}
