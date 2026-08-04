"use client";

import { useEffect, useState } from "react";
import { Navigation, Radio } from "lucide-react";
import { DeliveryMap } from "@/components/shared/delivery-map";
import { formatDistance } from "@/lib/utils";

interface LiveRiderTrackerProps {
  orderId: string;
  pickup: { lat: number; lng: number; label: string };
  delivery: { lat: number; lng: number; label: string };
}

interface RiderLocation {
  active: boolean;
  lat?: number;
  lng?: number;
  riderName?: string;
  etaMinutes?: number | null;
  distanceKm?: number | null;
  headingTo?: "pickup" | "delivery";
}

const POLL_MS = 10_000;

// Coarse (few-meter-to-few-hundred-meter, whatever the rider's phone GPS
// gives) beats no location at all for trust and delivery-time planning —
// especially in the low-connectivity rural areas this platform targets.
export function LiveRiderTracker({ orderId, pickup, delivery }: LiveRiderTrackerProps) {
  const [rider, setRider] = useState<RiderLocation | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch(`/api/orders/${orderId}/rider-location`);
        if (res.ok && !cancelled) setRider(await res.json());
      } catch {
        /* network blip — keep last known position */
      }
    }
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, [orderId]);

  const hasLivePosition = rider?.active && rider.lat != null && rider.lng != null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-[#1c3a13]">
        <Radio className={`h-3.5 w-3.5 ${hasLivePosition ? "text-green-600 animate-pulse" : "text-[#1c3a13]/30"}`} />
        <span className="font-medium">
          {hasLivePosition ? `${rider?.riderName ?? "Your rider"} is on the move` : "Waiting for rider's live location…"}
        </span>
        {hasLivePosition && rider?.distanceKm != null && rider?.etaMinutes != null && (
          <span className="text-[#1c3a13]/50 flex items-center gap-1">
            <Navigation className="h-3 w-3" />
            {formatDistance(rider.distanceKm)} from {rider.headingTo} · ~{rider.etaMinutes} min
          </span>
        )}
      </div>
      <DeliveryMap
        pickup={pickup}
        delivery={delivery}
        rider={hasLivePosition ? { lat: rider!.lat!, lng: rider!.lng!, label: `${rider?.riderName ?? "Rider"} — live location` } : null}
        height={220}
      />
    </div>
  );
}
