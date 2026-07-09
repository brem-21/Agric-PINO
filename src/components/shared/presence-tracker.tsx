"use client";

import { useEffect, useRef } from "react";

export const RIDER_OFFLINE_KEY = "lorgric_rider_offline";
const HEARTBEAT_MS = 30_000;

interface PresenceTrackerProps {
  isRider?: boolean;
}

export function PresenceTracker({ isRider = false }: PresenceTrackerProps) {
  const watchIdRef = useRef<number | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isOfflineRef = useRef(false);

  useEffect(() => {
    function readOfflineFlag(): boolean {
      try {
        return localStorage.getItem(RIDER_OFFLINE_KEY) === "true";
      } catch {
        return false;
      }
    }

    function postPresence(coords?: { latitude: number; longitude: number }) {
      if (isOfflineRef.current) return;
      const body: Record<string, unknown> = {};
      if (coords && isRider) {
        body.latitude = coords.latitude;
        body.longitude = coords.longitude;
      }
      fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).catch(() => {});
    }

    function clearWatcher() {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (heartbeatRef.current !== null) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
    }

    function startTracking() {
      if (!isOfflineRef.current) return; // already running guard
      isOfflineRef.current = false;
      clearWatcher(); // defensive clear

      if (isRider && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => postPresence({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
          () => postPresence(),
          { timeout: 8000, maximumAge: 10_000 }
        );

        watchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => postPresence({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
          () => {},
          { enableHighAccuracy: true, timeout: 10_000, maximumAge: 5_000 }
        );

        // Keep lastSeen fresh when not physically moving
        heartbeatRef.current = setInterval(() => postPresence(), HEARTBEAT_MS);
      } else {
        postPresence();
        heartbeatRef.current = setInterval(() => postPresence(), HEARTBEAT_MS);
      }
    }

    function goOffline() {
      isOfflineRef.current = true;
      clearWatcher();
      fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offline: true }),
      }).catch(() => {});
    }

    function syncState() {
      const wantOffline = readOfflineFlag();
      if (wantOffline && !isOfflineRef.current) {
        goOffline();
      } else if (!wantOffline && isOfflineRef.current) {
        startTracking();
      }
    }

    // Boot
    if (readOfflineFlag()) {
      isOfflineRef.current = true;
    } else {
      isOfflineRef.current = true; // trick startTracking guard
      startTracking();
    }

    window.addEventListener("lorgric:offline-toggle", syncState);

    return () => {
      window.removeEventListener("lorgric:offline-toggle", syncState);
      clearWatcher();
    };
  }, [isRider]);

  return null;
}
