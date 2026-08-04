"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StorageFacilityMap, type StorageFacility, type RouteOption } from "@/components/shared/storage-facility-map";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NORTHERN_GHANA_REGIONS, STORAGE_EQUIPMENT } from "@/lib/utils";
import {
  Loader2, MapPin, Snowflake, Package, Star, ArrowRight, LocateFixed, Navigation, Satellite, Map as MapIcon, AlertCircle, Sparkles, RefreshCw, Wrench,
} from "lucide-react";

const STORAGE_TYPE_LABEL: Record<string, string> = {
  COLD_CHAIN: "Cold Chain",
  HERMETIC_DRY: "Hermetic/Dry",
};

const EQUIPMENT_LABEL: Record<string, string> = Object.fromEntries(STORAGE_EQUIPMENT.map((e) => [e.value, e.label]));

interface FacilityRecommendation {
  facilityId: string | null;
  facilityName: string | null;
  reason: string;
}

export default function FarmerFindStoragePage() {
  const [facilities, setFacilities] = useState<StorageFacility[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [location, setLocation] = useState("all");

  const [originPin, setOriginPin] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [satellite, setSatellite] = useState(false);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [routeIndex, setRouteIndex] = useState(0);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [routeError, setRouteError] = useState("");

  const [recommendation, setRecommendation] = useState<FacilityRecommendation | null>(null);
  const [recLoading, setRecLoading] = useState(true);
  const [recRegenerating, setRecRegenerating] = useState(false);

  const fetchFacilities = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (location !== "all") params.set("location", location);
    fetch(`/api/storage/facilities?${params}`)
      .then((r) => r.json())
      .then((d) => setFacilities(d.facilities ?? []))
      .finally(() => setLoading(false));
  }, [location]);

  useEffect(() => { fetchFacilities(); }, [fetchFacilities]);

  useEffect(() => {
    fetch("/api/farmer/facility-recommendation")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setRecommendation(d))
      .finally(() => setRecLoading(false));
  }, []);

  async function regenerateRecommendation() {
    setRecRegenerating(true);
    try {
      const res = await fetch("/api/farmer/facility-recommendation", { method: "POST" });
      if (res.ok) setRecommendation(await res.json());
    } finally {
      setRecRegenerating(false);
    }
  }

  function useGPS() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOriginPin({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 8000 }
    );
  }

  const fetchRoutes = useCallback(async (facility: StorageFacility) => {
    if (!originPin || facility.latitude == null || facility.longitude == null) return;
    setLoadingRoutes(true);
    setRouteError("");
    setRoutes([]);
    setRouteIndex(0);
    try {
      const params = new URLSearchParams({
        fromLat: String(originPin.lat),
        fromLng: String(originPin.lng),
        toLat: String(facility.latitude),
        toLng: String(facility.longitude),
      });
      const res = await fetch(`/api/routing?${params}`);
      const data = await res.json();
      if (!res.ok || !data.routes?.length) {
        setRouteError(data.error ?? "No route found");
        return;
      }
      setRoutes(data.routes);
    } catch {
      setRouteError("Routing service is unavailable right now — try again shortly.");
    } finally {
      setLoadingRoutes(false);
    }
  }, [originPin]);

  const selectedFacility = facilities.find((f) => f.id === selectedId) ?? null;

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

      {/* AI facility recommendation */}
      {!recLoading && recommendation && (
        <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] p-5 flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#d3fa99] flex-shrink-0">
            <Sparkles className="h-4 w-4 text-[#1c3a13]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-[#1c3a13]">
                {recommendation.facilityName ? `AI Recommends: ${recommendation.facilityName}` : "AI Recommendation"}
              </p>
              <button
                onClick={regenerateRecommendation}
                disabled={recRegenerating}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#1c3a13]/50 hover:text-[#1c3a13] disabled:opacity-50 flex-shrink-0"
              >
                {recRegenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                Refresh
              </button>
            </div>
            <p className="text-sm text-[#1c3a13]/70 mt-1">{recommendation.reason}</p>
            {recommendation.facilityId && (
              <button
                onClick={() => setSelectedId(recommendation.facilityId)}
                className="text-xs font-medium text-[#1c3a13] hover:underline mt-1.5 inline-block"
              >
                View on map
              </button>
            )}
          </div>
        </div>
      )}

      {/* Location filter */}
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-[#1c3a13]/40" />
        <Select value={location} onValueChange={setLocation}>
          <SelectTrigger className="w-56 bg-[#fcfcf7] border-[#eeeee9] text-[#1c3a13] rounded-full focus:ring-[#1c3a13]">
            <SelectValue placeholder="All regions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All regions</SelectItem>
            {NORTHERN_GHANA_REGIONS.map((r) => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-[#1c3a13]/40" /></div>
      ) : (
        <div className="grid lg:grid-cols-[1fr_360px] gap-4">
          <div className="space-y-2">
            {/* Map controls */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={useGPS}
                disabled={locating}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#eeeee9] bg-[#fcfcf7] px-3 py-1.5 text-xs font-medium text-[#1c3a13]/70 hover:border-[#1c3a13] hover:text-[#1c3a13] disabled:opacity-50"
              >
                {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LocateFixed className="h-3.5 w-3.5" />}
                Use my location
              </button>
              <button
                onClick={() => setSatellite((v) => !v)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  satellite ? "border-[#1c3a13] bg-[#eeeee9] text-[#1c3a13]" : "border-[#eeeee9] bg-[#fcfcf7] text-[#1c3a13]/70 hover:border-[#1c3a13] hover:text-[#1c3a13]"
                }`}
              >
                {satellite ? <MapIcon className="h-3.5 w-3.5" /> : <Satellite className="h-3.5 w-3.5" />}
                {satellite ? "Street view" : "Satellite view"}
              </button>
              {originPin && selectedFacility && (
                <button
                  onClick={() => fetchRoutes(selectedFacility)}
                  disabled={loadingRoutes}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#1c3a13] px-3 py-1.5 text-xs font-medium text-[#fcfcf7] hover:bg-[#2a5219] disabled:opacity-50"
                >
                  {loadingRoutes ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Navigation className="h-3.5 w-3.5" />}
                  Get Directions
                </button>
              )}
            </div>

            <div className="h-[420px] rounded-2xl border border-[#eeeee9] overflow-hidden">
              <StorageFacilityMap
                facilities={facilities}
                selectedFacilityId={selectedId}
                onSelectFacility={setSelectedId}
                originPin={originPin}
                routes={routes}
                selectedRouteIndex={routeIndex}
                satellite={satellite}
              />
            </div>

            {/* Route options + disclaimer */}
            {routeError && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                {routeError}
              </div>
            )}
            {routes.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {routes.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => setRouteIndex(i)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                      i === routeIndex ? "bg-[#1c3a13] text-[#fcfcf7] border-[#1c3a13]" : "border-[#eeeee9] text-[#1c3a13]/70 hover:border-[#1c3a13]"
                    }`}
                  >
                    Route {i + 1} · {r.distanceKm} km · ~{r.durationMin} min
                  </button>
                ))}
              </div>
            )}
            {(routes.length > 0 || originPin) && (
              <p className="text-xs text-[#1c3a13]/40">
                Alternate routes and satellite imagery come from free public map services — not live traffic or road-condition data.
              </p>
            )}
          </div>

          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {facilities.length === 0 ? (
              <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] py-16 text-center px-4">
                <div className="text-4xl mb-3">🏠</div>
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
                  {f.description && (
                    <p className="text-xs text-[#1c3a13]/60 mt-1.5 line-clamp-2">{f.description}</p>
                  )}
                  <p className="text-xs text-[#1c3a13]/50 mt-1.5">
                    Accepts: {f.acceptedCategories.length >= 6 ? "all crop types" : f.acceptedCategories.join(", ")}
                  </p>
                  {f.equipment.length > 0 && (
                    <p className="flex items-start gap-1.5 text-xs text-[#1c3a13]/50 mt-1">
                      <Wrench className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      {f.equipment.map((e) => EQUIPMENT_LABEL[e] ?? e).join(", ")}
                    </p>
                  )}
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
