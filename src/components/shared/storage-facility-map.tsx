"use client";

import dynamic from "next/dynamic";

export const StorageFacilityMap = dynamic(() => import("./storage-facility-map-inner"), {
  ssr: false,
  loading: () => (
    <div className="h-full min-h-[400px] animate-pulse rounded-2xl bg-gray-100 flex items-center justify-center">
      <p className="text-sm text-gray-400">Loading map…</p>
    </div>
  ),
});
export type { StorageFacility } from "./storage-facility-map-inner";
