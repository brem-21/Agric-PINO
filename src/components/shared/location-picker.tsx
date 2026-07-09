"use client";
import dynamic from "next/dynamic";

export const LocationPicker = dynamic(
  () => import("./location-picker-inner"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[300px] animate-pulse rounded-xl bg-gray-100 flex items-center justify-center">
        <p className="text-sm text-gray-400">Loading map…</p>
      </div>
    ),
  }
);
