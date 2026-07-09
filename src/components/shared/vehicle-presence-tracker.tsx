"use client";

import { useState, useEffect, useRef } from "react";
import { Navigation, NavigationOff, Loader2 } from "lucide-react";

const ACTIVE_VEHICLE_KEY = "lorgric_active_vehicle";
const HEARTBEAT_MS = 30_000;

function postVehiclePresence(vehicleId: string, coords?: { latitude: number; longitude: number }) {
  const body: Record<string, unknown> = { vehicleId };
  if (coords) {
    body.latitude = coords.latitude;
    body.longitude = coords.longitude;
  }
  return fetch("/api/vendor/fleet", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => {});
}

function stopVehiclePresence(vehicleId: string) {
  return fetch("/api/vendor/fleet", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vehicleId, offline: true }),
  }).catch(() => {});
}

interface VehicleTrackButtonProps {
  vehicleId: string;
  vehicleLabel: string;
}

export function VehicleTrackButton({ vehicleId, vehicleLabel }: VehicleTrackButtonProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    try {
      setActiveId(localStorage.getItem(ACTIVE_VEHICLE_KEY));
    } catch {
      // ignore
    }
  }, []);

  const isActive = activeId === vehicleId;

  function stopTracking(id: string) {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (heartbeatRef.current !== null) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
    stopVehiclePresence(id);
    try {
      localStorage.removeItem(ACTIVE_VEHICLE_KEY);
    } catch {
      // ignore
    }
    setActiveId(null);
  }

  function startTracking() {
    setStarting(true);
    // Stop any currently tracked vehicle first
    if (activeId) stopTracking(activeId);

    if (!navigator.geolocation) {
      setStarting(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        postVehiclePresence(vehicleId, {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });

        watchIdRef.current = navigator.geolocation.watchPosition(
          (p) => postVehiclePresence(vehicleId, { latitude: p.coords.latitude, longitude: p.coords.longitude }),
          () => {},
          { enableHighAccuracy: true, timeout: 10_000, maximumAge: 5_000 }
        );

        heartbeatRef.current = setInterval(
          () => postVehiclePresence(vehicleId),
          HEARTBEAT_MS
        );

        try {
          localStorage.setItem(ACTIVE_VEHICLE_KEY, vehicleId);
        } catch {
          // ignore
        }
        setActiveId(vehicleId);
        setStarting(false);
      },
      () => {
        setStarting(false);
      },
      { timeout: 8000, maximumAge: 10_000 }
    );
  }

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (heartbeatRef.current !== null) {
        clearInterval(heartbeatRef.current);
      }
    };
  }, []);

  if (isActive) {
    return (
      <button
        onClick={() => stopTracking(vehicleId)}
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold bg-[#d3fa99] text-[#1c3a13] hover:bg-[#eeeee9] transition-colors border border-[#eeeee9]"
        title={`Stop sharing location for ${vehicleLabel}`}
      >
        <span className="w-2 h-2 rounded-full bg-[#1c3a13] animate-pulse" />
        Live · Stop
        <NavigationOff className="h-3 w-3 ml-0.5" />
      </button>
    );
  }

  return (
    <button
      onClick={startTracking}
      disabled={starting}
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 transition-colors border border-gray-200 disabled:opacity-50"
      title={`Share your location for ${vehicleLabel}`}
    >
      {starting ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Navigation className="h-3 w-3" />
      )}
      Track Me Here
    </button>
  );
}
