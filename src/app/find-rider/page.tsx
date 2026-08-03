"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  calculateFare,
  haversineDistance,
  formatCurrency,
  getOnlineStatus,
  type FareEstimate,
} from "@/lib/utils";
import { RiderMap, type Rider, type MapPin } from "@/components/shared/rider-map";
import { AvatarWithStatus, OnlineIndicator } from "@/components/shared/online-indicator";
import { ArrowLeft, Leaf, MapPin as PinIcon, Navigation, Star, Phone, CheckCircle2, Truck } from "lucide-react";
import Link from "next/link";

interface Toast {
  message: string;
  type: "success" | "error";
}

type MapMode = "pickup" | "delivery" | null;

interface DeliveryUnit {
  id: string;
  category: "RIDER";
  vehicleType: string;
  name: string;
  phone: string | null;
  companyName: string | null;
  licensePlate: string | null;
  capacity: number | null;
  rating: number | null;
  totalRatings: number | null;
  lastSeen: string | null;
  latitude: number | null;
  longitude: number | null;
  isVerified: boolean;
}

function usePortalHref() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role === "FARMER") return "/farmer/dashboard";
  if (role === "BUYER") return "/buyer/dashboard";
  return "/";
}

export default function FindDeliveryPage() {
  const portalHref = usePortalHref();
  const [units, setUnits] = useState<DeliveryUnit[]>([]);
  const [mapMode, setMapMode] = useState<MapMode>(null);
  const [pickupPin, setPickupPin] = useState<MapPin | null>(null);
  const [deliveryPin, setDeliveryPin] = useState<MapPin | null>(null);
  const [pickupLabel, setPickupLabel] = useState("");
  const [deliveryLabel, setDeliveryLabel] = useState("");
  const [weightKg, setWeightKg] = useState(50);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const fare: FareEstimate | null =
    pickupPin && deliveryPin
      ? calculateFare(
          haversineDistance(pickupPin.lat, pickupPin.lng, deliveryPin.lat, deliveryPin.lng),
          weightKg
        )
      : null;

  const distanceKm =
    pickupPin && deliveryPin
      ? haversineDistance(pickupPin.lat, pickupPin.lng, deliveryPin.lat, deliveryPin.lng)
      : null;

  const fetchUnits = useCallback(async () => {
    try {
      const res = await fetch("/api/delivery/available");
      if (res.ok) {
        const data = await res.json();
        setUnits(data.units ?? []);
      }
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => {
    fetchUnits();
    const interval = setInterval(fetchUnits, 8_000);
    return () => clearInterval(interval);
  }, [fetchUnits]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4_000);
    return () => clearTimeout(t);
  }, [toast]);

  function showToast(message: string, type: "success" | "error") {
    setToast({ message, type });
  }

  // Resolves a coordinate pin to a human-readable place name in the
  // background, upgrading the raw-coordinate placeholder once it's ready —
  // riders otherwise see bare lat/lng or an unhelpful "My location" string.
  async function resolvePlaceName(lat: number, lng: number, placeholder: string, setLabel: (fn: (current: string) => string) => void) {
    try {
      const res = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
      if (!res.ok) return;
      const { place } = await res.json();
      if (place) setLabel((current) => (current === placeholder ? place : current));
    } catch {
      // best-effort — the coordinate placeholder remains if this fails
    }
  }

  function handleMapClick(lat: number, lng: number) {
    if (mapMode === "pickup") {
      setPickupPin({ lat, lng, type: "pickup" });
      if (!pickupLabel) {
        const placeholder = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        setPickupLabel(placeholder);
        resolvePlaceName(lat, lng, placeholder, setPickupLabel);
      }
    } else if (mapMode === "delivery") {
      setDeliveryPin({ lat, lng, type: "delivery" });
      if (!deliveryLabel) {
        const placeholder = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        setDeliveryLabel(placeholder);
        resolvePlaceName(lat, lng, placeholder, setDeliveryLabel);
      }
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setPickupPin({ lat: latitude, lng: longitude, type: "pickup" });
        if (!pickupLabel) {
          const placeholder = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          setPickupLabel(placeholder);
          resolvePlaceName(latitude, longitude, placeholder, setPickupLabel);
        }
      },
      () => showToast("Could not get your location", "error"),
      { timeout: 8000 }
    );
  }

  async function handleBook() {
    if (!pickupPin || !deliveryPin) {
      showToast("Please set both pickup and delivery points on the map", "error");
      return;
    }
    if (!pickupLabel || !deliveryLabel) {
      showToast("Please enter location names", "error");
      return;
    }

    setBooking(true);
    try {
      const res = await fetch("/api/transport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pickupLocation: pickupLabel,
          pickupLat: pickupPin.lat,
          pickupLong: pickupPin.lng,
          deliveryLocation: deliveryLabel,
          deliveryLat: deliveryPin.lat,
          deliveryLong: deliveryPin.lng,
          scheduledDate: new Date().toISOString(),
          estimatedCost: fare?.total,
          notes: fare
            ? `Est. fare: GHS ${fare.total.toFixed(2)}. Weight: ${weightKg} kg.${selectedId ? ` Requested unit: ${selectedId}` : ""}`
            : undefined,
        }),
      });

      if (res.ok) {
        showToast(
          fare ? `Delivery request sent! Est. fare: ${formatCurrency(fare.total)}` : "Delivery request sent!",
          "success"
        );
        setPickupPin(null);
        setDeliveryPin(null);
        setPickupLabel("");
        setDeliveryLabel("");
        setSelectedId(null);
        setMapMode(null);
      } else {
        const data = await res.json();
        showToast(data.error ?? "Failed to send request", "error");
      }
    } catch {
      showToast("Something went wrong. Please try again.", "error");
    } finally {
      setBooking(false);
    }
  }

  const mapRiders: Rider[] = units.map((r) => ({
    id: r.id,
    name: r.name,
    phone: r.phone ?? "",
    companyName: r.companyName,
    licensePlate: r.licensePlate,
    rating: r.rating ?? 0,
    totalRatings: r.totalRatings ?? 0,
    lastSeen: r.lastSeen,
    latitude: r.latitude,
    longitude: r.longitude,
    isVerified: r.isVerified,
  }));

  const onlineCount = units.filter((u) => getOnlineStatus(u.lastSeen) === "online").length;

  const sorted = [...units].sort((a, b) => {
    const order = { online: 0, away: 1, offline: 2 };
    const aS = getOnlineStatus(a.lastSeen);
    const bS = getOnlineStatus(b.lastSeen);
    if (order[aS] !== order[bS]) return order[aS] - order[bS];
    if (pickupPin && a.latitude && a.longitude && b.latitude && b.longitude) {
      return (
        haversineDistance(pickupPin.lat, pickupPin.lng, a.latitude, a.longitude) -
        haversineDistance(pickupPin.lat, pickupPin.lng, b.latitude, b.longitude)
      );
    }
    return 0;
  });

  return (
    <div className="flex h-screen overflow-hidden bg-[#fcfcf7]">
      {/* Left panel */}
      <div className="w-96 flex-shrink-0 bg-[#fcfcf7] border-r border-[#eeeee9] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-[#eeeee9]">
          <div className="flex items-center justify-between mb-2">
            <Link
              href={portalHref}
              className="inline-flex items-center gap-1.5 text-sm text-[#1c3a13]/50 hover:text-[#1c3a13] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to portal
            </Link>
            <Link href="/" className="flex items-center gap-1.5 text-[#1c3a13]">
              <Leaf className="h-4 w-4" />
              <span className="font-medium text-sm">Lorgric</span>
            </Link>
          </div>
          <h1 className="text-xl font-light tracking-tight text-[#1c3a13]">Find Delivery</h1>
          <p className="text-sm text-[#1c3a13]/50 mt-0.5">Book a motorbike, bus, or truck for your delivery</p>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="inline-block h-2 w-2 rounded-full bg-[#d3fa99]" />
            <span className="text-xs text-[#1c3a13]/70">
              {units.length} available · {onlineCount} online now
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Map mode toggle */}
          <div>
            <p className="text-xs font-medium text-[#1c3a13]/50 uppercase tracking-wide mb-2">
              Set route on map
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setMapMode(mapMode === "pickup" ? null : "pickup")}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium transition-colors ${
                  mapMode === "pickup"
                    ? "bg-orange-500 border-orange-500 text-white"
                    : "border-[#eeeee9] text-[#1c3a13] hover:bg-orange-50 hover:border-orange-300"
                }`}
              >
                <PinIcon className="h-4 w-4" />
                Set Pickup
              </button>
              <button
                onClick={() => setMapMode(mapMode === "delivery" ? null : "delivery")}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium transition-colors ${
                  mapMode === "delivery"
                    ? "bg-blue-500 border-blue-500 text-white"
                    : "border-[#eeeee9] text-[#1c3a13] hover:bg-blue-50 hover:border-blue-300"
                }`}
              >
                <PinIcon className="h-4 w-4" />
                Set Delivery
              </button>
            </div>
            {mapMode && (
              <p className="text-xs text-[#1c3a13]/40 mt-1.5">
                Click anywhere on the map to place the{" "}
                <span className="font-medium">{mapMode}</span> point
              </p>
            )}
          </div>

          {/* Location labels */}
          <div className="space-y-2">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-orange-500" />
              <input
                type="text"
                placeholder="Pickup location name"
                value={pickupLabel}
                onChange={(e) => setPickupLabel(e.target.value)}
                className="w-full pl-7 pr-3 py-2 text-sm border border-[#eeeee9] bg-[#fcfcf7] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1c3a13]"
              />
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-blue-500" />
              <input
                type="text"
                placeholder="Delivery location name"
                value={deliveryLabel}
                onChange={(e) => setDeliveryLabel(e.target.value)}
                className="w-full pl-7 pr-3 py-2 text-sm border border-[#eeeee9] bg-[#fcfcf7] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1c3a13]"
              />
            </div>
            <button
              onClick={useMyLocation}
              className="flex items-center gap-1.5 text-xs text-[#1c3a13] hover:text-[#2a5219] font-medium"
            >
              <Navigation className="h-3.5 w-3.5" />
              Use my current location for pickup
            </button>
          </div>

          {/* Weight */}
          <div>
            <label className="text-xs font-medium text-[#1c3a13]/50 uppercase tracking-wide block mb-1.5">
              Order weight (kg)
            </label>
            <input
              type="number"
              min={1}
              max={5000}
              value={weightKg}
              onChange={(e) => setWeightKg(Math.max(1, Number(e.target.value)))}
              className="w-full px-3 py-2 text-sm border border-[#eeeee9] bg-[#fcfcf7] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1c3a13]"
            />
          </div>

          {/* Fare estimate */}
          {fare && distanceKm !== null && (
            <div className="rounded-2xl bg-[#d3fa99] border border-[#eeeee9] p-3 space-y-1.5">
              <p className="text-xs font-medium text-[#1c3a13] uppercase tracking-wide">
                Fare Estimate
              </p>
              <p className="text-xs text-[#1c3a13]/50">Distance: {distanceKm} km</p>
              <div className="text-xs text-[#1c3a13]/70 space-y-0.5">
                <div className="flex justify-between">
                  <span>Base fare</span>
                  <span>{formatCurrency(fare.baseFare)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Distance ({distanceKm} km × GHS 1.80)</span>
                  <span>{formatCurrency(fare.distanceCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Weight ({weightKg} kg × GHS 0.50)</span>
                  <span>{formatCurrency(fare.weightCost)}</span>
                </div>
              </div>
              <div className="flex justify-between items-center border-t border-[#1c3a13]/20 pt-1.5 mt-1">
                <span className="font-bold text-[#1c3a13]">Total</span>
                <span className="text-lg font-bold text-[#1c3a13]">{formatCurrency(fare.total)}</span>
              </div>
              <p className="text-xs text-[#1c3a13]/50 text-center">
                Estimated arrival: ~{fare.etaMinutes} minutes
              </p>
            </div>
          )}

          {/* Unit list */}
          <div>
            <p className="text-xs font-medium text-[#1c3a13]/50 uppercase tracking-wide mb-2">
              Available Riders ({units.length})
            </p>
            {sorted.length === 0 ? (
              <div className="text-center py-8">
                <Truck className="h-8 w-8 mx-auto mb-2 text-[#1c3a13]/40" />
                <p className="text-sm text-[#1c3a13]/40">No units available</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sorted.map((unit) => {
                  const status = getOnlineStatus(unit.lastSeen);
                  const selected = unit.id === selectedId;
                  const distFromPickup =
                    pickupPin && unit.latitude && unit.longitude
                      ? haversineDistance(pickupPin.lat, pickupPin.lng, unit.latitude, unit.longitude)
                      : null;

                  return (
                      <button
                        key={unit.id}
                        onClick={() => setSelectedId(selected ? null : unit.id)}
                        className={`w-full text-left rounded-2xl border p-3 transition-colors ${
                          selected
                            ? "border-[#1c3a13] bg-[#eeeee9]"
                            : "border-[#eeeee9] bg-[#fcfcf7] hover:border-[#1c3a13] hover:bg-[#eeeee9]"
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <AvatarWithStatus
                            name={unit.name}
                            lastSeen={unit.lastSeen}
                            size="sm"
                            bgColor="bg-amber-500"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="text-sm font-medium text-[#1c3a13] truncate">
                                {unit.name}
                              </span>
                              {unit.isVerified && (
                                <CheckCircle2 className="h-3.5 w-3.5 text-[#1c3a13] flex-shrink-0" />
                              )}
                            </div>
                            {unit.companyName && (
                              <p className="text-xs text-[#1c3a13]/50 truncate">{unit.companyName}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {unit.rating !== null && (
                                <span className="flex items-center gap-0.5 text-xs text-amber-600">
                                  <Star className="h-3 w-3" />
                                  {unit.rating.toFixed(1)} ({unit.totalRatings})
                                </span>
                              )}
                              <OnlineIndicator lastSeen={unit.lastSeen} size="sm" />
                              <span className="text-xs text-[#1c3a13]/40">
                                {status === "online" ? "Online" : status === "away" ? "Recently online" : "Offline"}
                              </span>
                            </div>
                            {distFromPickup !== null && (
                              <p className="text-xs text-[#1c3a13]/40 mt-0.5">
                                {distFromPickup.toFixed(1)} km from pickup
                              </p>
                            )}
                            {fare && (
                              <p className="text-xs font-medium text-[#1c3a13] mt-0.5">
                                Est. {formatCurrency(fare.total)} · ~{fare.etaMinutes} min
                              </p>
                            )}
                          </div>
                          {selected && (
                            <CheckCircle2 className="h-4 w-4 text-[#1c3a13] flex-shrink-0 mt-0.5" />
                          )}
                        </div>
                        {unit.phone && (
                          <a
                            href={`tel:${unit.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 text-xs text-[#1c3a13] mt-1.5 hover:underline"
                          >
                            <Phone className="h-3 w-3" />
                            {unit.phone}
                          </a>
                        )}
                      </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Book button */}
        <div className="flex-shrink-0 p-4 border-t border-[#eeeee9]">
          <button
            onClick={handleBook}
            disabled={booking || !pickupPin || !deliveryPin}
            className="w-full rounded-full py-3 font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-[#fcfcf7] bg-[#1c3a13] hover:bg-[#2a5219]"
          >
            {booking
              ? "Sending request..."
              : fare
              ? `Book Rider — ${formatCurrency(fare.total)}`
              : "Book Delivery"}
          </button>
          {(!pickupPin || !deliveryPin) && (
            <p className="text-xs text-[#1c3a13]/40 text-center mt-1.5">
              Set pickup and delivery points on the map to continue
            </p>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <RiderMap
          riders={mapRiders}
          pickupPin={pickupPin}
          deliveryPin={deliveryPin}
          selectedRiderId={selectedId}
          onSelectRider={(id) => setSelectedId(selectedId === id ? null : id)}
          onMapClick={handleMapClick}
          fareEstimate={fare}
        />
        {mapMode && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-[#fcfcf7] border border-[#eeeee9] rounded-full px-4 py-2 text-sm font-medium text-[#1c3a13] pointer-events-none">
            Click on the map to set{" "}
            <span
              className={
                mapMode === "pickup" ? "text-orange-500 font-bold" : "text-blue-500 font-bold"
              }
            >
              {mapMode}
            </span>{" "}
            point
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-4 right-4 z-10 bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl px-3 py-2 text-xs space-y-1">
          <p className="font-medium text-[#1c3a13] mb-1">Legend</p>
          <div className="flex items-center gap-1.5"><span>🏍️</span><span className="text-[#1c3a13]/70">Motorbike Rider</span></div>
          <div className="flex items-center gap-1.5"><span>🚌</span><span className="text-[#1c3a13]/70">Bus / Minibus</span></div>
          <div className="flex items-center gap-1.5"><span>🚛</span><span className="text-[#1c3a13]/70">Pickup Truck</span></div>
          <div className="flex items-center gap-1.5"><span>🚐</span><span className="text-[#1c3a13]/70">Van</span></div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full text-sm font-medium text-white transition-all ${
            toast.type === "success" ? "bg-[#1c3a13]" : "bg-red-600"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
