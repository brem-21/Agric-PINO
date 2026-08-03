"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StorageFacilityMap, type StorageFacility } from "@/components/shared/storage-facility-map";
import { Loader2, MapPin, Snowflake, Package, Star, ArrowRight } from "lucide-react";

const STORAGE_TYPE_LABEL: Record<string, string> = {
  COLD_CHAIN: "Cold Chain",
  HERMETIC_DRY: "Hermetic/Dry",
};

export default function FarmerFindStoragePage() {
  const [facilities, setFacilities] = useState<StorageFacility[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/storage/facilities")
      .then((r) => r.json())
      .then((d) => setFacilities(d.facilities ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-light tracking-tight text-[#1c3a13]">Find a Storage Facility</h1>
          <p className="text-[#1c3a13]/50 text-sm mt-1">
            Book a drop-off instead of holding produce yourself — the facility takes a 5% commission on any sale, you keep the rest.
          </p>
        </div>
        <Button asChild variant="outline" className="rounded-full border-[#eeeee9] text-[#1c3a13] hover:bg-[#eeeee9]">
          <Link href="/farmer/storage/bookings">My Bookings</Link>
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-[#1c3a13]/40" /></div>
      ) : (
        <div className="grid lg:grid-cols-[1fr_360px] gap-4">
          <div className="h-[420px] rounded-2xl border border-[#eeeee9] overflow-hidden">
            <StorageFacilityMap
              facilities={facilities}
              selectedFacilityId={selectedId}
              onSelectFacility={setSelectedId}
            />
          </div>

          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {facilities.length === 0 ? (
              <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] py-16 text-center px-4">
                <div className="text-4xl mb-3">🏬</div>
                <p className="text-[#1c3a13]/50 text-sm">No approved storage facilities yet in your area.</p>
              </div>
            ) : (
              facilities.map((f) => (
                <div
                  key={f.id}
                  onClick={() => setSelectedId(f.id)}
                  className={`bg-[#fcfcf7] rounded-2xl border p-4 cursor-pointer transition-colors ${
                    selectedId === f.id ? "border-[#1c3a13]" : "border-[#eeeee9] hover:border-[#1c3a13]/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-[#1c3a13]">{f.name}</p>
                    {f.storageTypes.includes("COLD_CHAIN") && <Snowflake className="h-4 w-4 text-blue-500 flex-shrink-0" />}
                  </div>
                  <p className="flex items-center gap-1.5 text-xs text-[#1c3a13]/50 mt-1">
                    <MapPin className="h-3 w-3" />{f.location}
                  </p>
                  <p className="text-xs text-[#1c3a13]/70 mt-1.5">
                    {f.storageTypes.map((t) => STORAGE_TYPE_LABEL[t] ?? t).join(" · ")}
                  </p>
                  {f.capacityTonnes && (
                    <p className="flex items-center gap-1.5 text-xs text-[#1c3a13]/50 mt-1">
                      <Package className="h-3 w-3" />~{f.capacityTonnes}t capacity
                    </p>
                  )}
                  <p className="flex items-center gap-1 text-xs text-[#1c3a13]/50 mt-1">
                    <Star className="h-3 w-3" />{f.rating.toFixed(1)} ({f.totalRatings})
                  </p>
                  <Button asChild size="sm" className="w-full mt-3 rounded-full bg-[#1c3a13] text-[#fcfcf7] hover:bg-[#2a5219]">
                    <Link href={`/farmer/storage/${f.id}/book`}>
                      Book Drop-off <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Link>
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
