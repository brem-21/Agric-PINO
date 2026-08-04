"use client";

import dynamic from "next/dynamic";

export const RiderMap = dynamic(() => import("./rider-map-inner"), { ssr: false });
export type { Rider, MapPin } from "./rider-map-inner";
