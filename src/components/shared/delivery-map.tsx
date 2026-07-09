"use client";
import dynamic from "next/dynamic";

export const DeliveryMap = dynamic(
  () => import("./delivery-map-inner"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[260px] animate-pulse rounded-xl bg-gray-100 flex items-center justify-center">
        <p className="text-sm text-gray-400">Loading map…</p>
      </div>
    ),
  }
);
