"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";

function getSessionId(): string {
  const KEY = "lorgric_sid";
  let id = sessionStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(KEY, id);
  }
  return id;
}

function getDeviceInfo(): Record<string, string> {
  const ua = navigator.userAgent;
  const os = /Windows/.test(ua)
    ? "Windows"
    : /iPhone|iPad/.test(ua)
    ? "iOS"
    : /Android/.test(ua)
    ? "Android"
    : /Mac/.test(ua)
    ? "macOS"
    : /Linux/.test(ua)
    ? "Linux"
    : "Unknown";
  const deviceType = /Mobi|Android/i.test(ua) ? "mobile" : /Tablet|iPad/i.test(ua) ? "tablet" : "desktop";
  return { os, deviceType };
}

type TrackFn = (type: string, data?: Record<string, unknown>) => void;

let cachedLocation: { lat: number; lon: number } | null = null;

export function useTracker(): { track: TrackFn } {
  const pathname = usePathname();
  const sidRef = useRef<string>("");
  const lastScrollDepth = useRef(0);

  useEffect(() => {
    sidRef.current = getSessionId();
  }, []);

  const track = useCallback<TrackFn>((type, data = {}) => {
    const sid = sidRef.current || getSessionId();
    const device = getDeviceInfo();
    fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: sid,
        type,
        data: { ...device, location: cachedLocation, url: pathname, ...data },
      }),
    }).catch(() => {});
  }, [pathname]);

  // Page view
  useEffect(() => {
    track("page_view", { referrer: typeof document !== "undefined" ? document.referrer : "" });
  }, [pathname, track]);

  // Geolocation (once per browser session)
  useEffect(() => {
    if (cachedLocation || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        cachedLocation = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        track("location_update", { lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy });
      },
      () => {},
      { maximumAge: 300_000, timeout: 10_000 }
    );
  }, [track]);

  // Scroll depth (debounced, only on 10% jumps)
  useEffect(() => {
    lastScrollDepth.current = 0;
    let timer: ReturnType<typeof setTimeout>;
    const handler = () => {
      const el = document.documentElement;
      const depth = Math.round(((window.scrollY + window.innerHeight) / el.scrollHeight) * 100);
      if (depth >= lastScrollDepth.current + 10) {
        lastScrollDepth.current = depth;
        clearTimeout(timer);
        timer = setTimeout(() => track("scroll", { depth }), 600);
      }
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => { window.removeEventListener("scroll", handler); clearTimeout(timer); };
  }, [pathname, track]);

  // Click tracking (links, buttons, [data-track] elements)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest("a, button, [data-track]") as HTMLElement | null;
      if (!el) return;
      track("click", {
        element: el.tagName.toLowerCase(),
        text: el.textContent?.trim().slice(0, 60) ?? "",
        href: (el as HTMLAnchorElement).href ?? "",
        trackId: (el as HTMLElement).dataset?.track ?? "",
      });
    };
    document.addEventListener("click", handler, { passive: true });
    return () => document.removeEventListener("click", handler);
  }, [pathname, track]);

  return { track };
}
