"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LocationPicker } from "@/components/shared/location-picker";
import {
  Truck,
  Plus,
  LocateFixed,
  Map,
  Loader2,
  AlertCircle,
  CheckCircle,
  X,
  MapPin,
  Calendar,
  Weight,
  DollarSign,
  RefreshCw,
  XCircle,
  PackageCheck,
} from "lucide-react";
import { calculateFare, haversineDistance, formatCurrency, formatDate } from "@/lib/utils";
import { TransportPaymentPanel } from "./payment-panel";

type TransportReqItem = {
  id: string;
  status: string;
  pickupLocation: string;
  deliveryLocation: string;
  scheduledDate: string;
  estimatedCost: number | null;
  weightKg: number | null;
  notes: string | null;
  paymentStatus: string;
  paymentMethod: string | null;
  order?: { listing: { cropType: string; quantity: number; unit: string } } | null;
  provider?: { user: { name: string } } | null;
};

const STATUS_STYLES: Record<string, string> = {
  PENDING:   "bg-[#eeeee9] text-[#1c3a13]",
  ASSIGNED:  "bg-[#eeeee9] text-[#1c3a13]",
  PICKED_UP: "bg-[#eeeee9] text-[#1c3a13]",
  IN_TRANSIT:"bg-[#eeeee9] text-[#1c3a13]",
  DELIVERED: "bg-[#d3fa99] text-[#1c3a13]",
  CANCELLED: "bg-red-100 text-red-800",
};

function TransportContent() {
  const params = useSearchParams();
  const router = useRouter();
  const orderIdParam = params.get("orderId");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [linkedOrder, setLinkedOrder] = useState<{ id: string; buyerName: string } | null>(null);

  // Request list
  const [requests, setRequests] = useState<TransportReqItem[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  // Form fields
  const [form, setForm] = useState({
    pickupLocation: "",
    deliveryLocation: "",
    scheduledDate: "",
    notes: "",
  });
  const [weightKg, setWeightKg] = useState(50);
  const [pickupLat, setPickupLat] = useState<number | null>(null);
  const [pickupLng, setPickupLng] = useState<number | null>(null);
  const [deliveryLat, setDeliveryLat] = useState<number | null>(null);
  const [deliveryLng, setDeliveryLng] = useState<number | null>(null);
  const [showPickupMap, setShowPickupMap] = useState(false);
  const [showDeliveryMap, setShowDeliveryMap] = useState(false);
  const [locating, setLocating] = useState<"pickup" | "delivery" | null>(null);

  // Pricing
  const [customPrice, setCustomPrice] = useState(false);
  const [offerPrice, setOfferPrice] = useState("");

  const fareEstimate =
    pickupLat && pickupLng && deliveryLat && deliveryLng
      ? calculateFare(
          haversineDistance(pickupLat, pickupLng, deliveryLat, deliveryLng),
          weightKg
        )
      : null;

  const fetchRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
      const res = await fetch("/api/transport");
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests ?? []);
      }
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  // Prefill pickup/delivery/notes from a specific order when arriving via "Assign Delivery"
  useEffect(() => {
    if (!orderIdParam) return;
    fetch(`/api/orders/${orderIdParam}`)
      .then((r) => r.json())
      .then((d) => {
        const order = d.order;
        if (!order) return;
        const buyerLocation =
          order.buyer.residenceLocation ||
          [order.buyer.district, order.buyer.region].filter(Boolean).join(", ") ||
          "Delivery address on file with buyer";

        setForm((f) => ({
          ...f,
          pickupLocation: order.listing.location ?? f.pickupLocation,
          deliveryLocation: buyerLocation,
          notes: `${order.listing.cropType} for ${order.buyer.name} (${order.buyer.phone})`,
        }));
        if (order.listing.latitude && order.listing.longitude) {
          setPickupLat(order.listing.latitude);
          setPickupLng(order.listing.longitude);
        }
        if (order.buyer.latitude && order.buyer.longitude) {
          setDeliveryLat(order.buyer.latitude);
          setDeliveryLng(order.buyer.longitude);
        }
        if (order.listing.unit === "kg") setWeightKg(order.quantity);
        setLinkedOrder({ id: order.id, buyerName: order.buyer.name });
        setShowForm(true);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderIdParam]);

  async function useGPS(field: "pickup" | "delivery") {
    if (!navigator.geolocation) return;
    setLocating(field);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await res.json();
          const name =
            data.address?.town ??
            data.address?.city ??
            data.address?.village ??
            `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          if (field === "pickup") {
            setForm((f) => ({ ...f, pickupLocation: name }));
            setPickupLat(latitude); setPickupLng(longitude);
          } else {
            setForm((f) => ({ ...f, deliveryLocation: name }));
            setDeliveryLat(latitude); setDeliveryLng(longitude);
          }
        } catch {
          const coord = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          if (field === "pickup") {
            setForm((f) => ({ ...f, pickupLocation: coord }));
            setPickupLat(latitude); setPickupLng(longitude);
          } else {
            setForm((f) => ({ ...f, deliveryLocation: coord }));
            setDeliveryLat(latitude); setDeliveryLng(longitude);
          }
        }
        setLocating(null);
      },
      () => setLocating(null),
      { timeout: 8000 }
    );
  }

  function resetForm() {
    setForm({ pickupLocation: "", deliveryLocation: "", scheduledDate: "", notes: "" });
    setWeightKg(50);
    setPickupLat(null); setPickupLng(null);
    setDeliveryLat(null); setDeliveryLng(null);
    setShowPickupMap(false); setShowDeliveryMap(false);
    setCustomPrice(false); setOfferPrice("");
    setLinkedOrder(null);
    setError("");
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const estimatedCost =
      customPrice && offerPrice
        ? parseFloat(offerPrice)
        : fareEstimate?.total;

    const res = await fetch("/api/transport", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        orderId: linkedOrder?.id,
        weightKg,
        estimatedCost,
        pickupLat: pickupLat ?? undefined,
        pickupLong: pickupLng ?? undefined,
        deliveryLat: deliveryLat ?? undefined,
        deliveryLong: deliveryLng ?? undefined,
      }),
    });

    if (res.ok) {
      resetForm();
      setShowForm(false);
      if (orderIdParam) {
        router.push("/farmer/orders");
      } else {
        setSuccess(true);
        fetchRequests();
        setTimeout(() => setSuccess(false), 4000);
      }
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to create request");
    }
    setLoading(false);
  };

  async function cancelRequest(id: string) {
    setCancelling(id);
    const res = await fetch("/api/transport", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId: id, action: "cancel_farmer" }),
    });
    if (res.ok) fetchRequests();
    setCancelling(null);
  }

  const locationButtonClass = (active: boolean) =>
    `inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
      active
        ? "border-[#1c3a13] bg-[#eeeee9] text-[#1c3a13]"
        : "border-[#eeeee9] bg-[#fcfcf7] text-[#1c3a13]/70 hover:border-[#1c3a13] hover:text-[#1c3a13]"
    }`;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light tracking-tight text-[#1c3a13]">Transport Requests</h1>
          <p className="text-[#1c3a13]/50 text-sm mt-1">Request transport for your produce</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={fetchRequests} title="Refresh" className="rounded-full text-[#1c3a13] hover:bg-[#eeeee9]">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => { setShowForm(!showForm); if (showForm) resetForm(); }} className="rounded-full bg-[#1c3a13] text-[#fcfcf7] hover:bg-[#2a5219]">
            {showForm ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            {showForm ? "Close" : "New Request"}
          </Button>
        </div>
      </div>

      {linkedOrder && (
        <div className="flex items-center gap-2 rounded-2xl bg-[#eeeee9] border border-[#eeeee9] p-3 text-sm text-[#1c3a13]">
          <PackageCheck className="h-4 w-4 flex-shrink-0" />
          Assigning delivery for <span className="font-medium">{linkedOrder.buyerName}</span>&apos;s order — pickup and delivery details are pre-filled below.
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-2xl bg-[#d3fa99] border border-[#1c3a13]/10 p-3 text-sm text-[#1c3a13]">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          Transport request submitted! Nearby riders will be notified.
        </div>
      )}

      {/* New Request Form */}
      {showForm && (
        <Card className="bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg font-medium text-[#1c3a13]">New Transport Request</CardTitle>
            <CardDescription className="text-[#1c3a13]/50">Set pickup and delivery locations for your produce</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Pickup Location */}
              <div className="space-y-2">
                <Label htmlFor="pickup" className="text-[#1c3a13]">Pickup Location *</Label>
                <Input
                  id="pickup"
                  placeholder="e.g. Tamale Central Market"
                  value={form.pickupLocation}
                  onChange={(e) => setForm((f) => ({ ...f, pickupLocation: e.target.value }))}
                  required
                  className="bg-[#fcfcf7] border-[#eeeee9] text-[#1c3a13] rounded-lg"
                />
                <div className="flex gap-2">
                  <button type="button" onClick={() => useGPS("pickup")} disabled={locating === "pickup"}
                    className={locationButtonClass(false) + " disabled:opacity-50"}>
                    {locating === "pickup" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LocateFixed className="h-3.5 w-3.5" />}
                    Use my location
                  </button>
                  <button type="button"
                    onClick={() => { setShowPickupMap((v) => !v); setShowDeliveryMap(false); }}
                    className={locationButtonClass(showPickupMap)}>
                    <Map className="h-3.5 w-3.5" />
                    {showPickupMap ? "Close map" : "Pick on map"}
                  </button>
                </div>
                {showPickupMap && (
                  <LocationPicker
                    onSelect={(lat, lng, label) => {
                      setPickupLat(lat); setPickupLng(lng);
                      setForm((f) => ({ ...f, pickupLocation: label }));
                      setShowPickupMap(false);
                    }}
                  />
                )}
              </div>

              {/* Delivery Location */}
              <div className="space-y-2">
                <Label htmlFor="delivery" className="text-[#1c3a13]">Delivery Location *</Label>
                <Input
                  id="delivery"
                  placeholder="e.g. Bolgatanga, Upper East"
                  value={form.deliveryLocation}
                  onChange={(e) => setForm((f) => ({ ...f, deliveryLocation: e.target.value }))}
                  required
                  className="bg-[#fcfcf7] border-[#eeeee9] text-[#1c3a13] rounded-lg"
                />
                <div className="flex gap-2">
                  <button type="button" onClick={() => useGPS("delivery")} disabled={locating === "delivery"}
                    className={locationButtonClass(false) + " disabled:opacity-50"}>
                    {locating === "delivery" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LocateFixed className="h-3.5 w-3.5" />}
                    Use my location
                  </button>
                  <button type="button"
                    onClick={() => { setShowDeliveryMap((v) => !v); setShowPickupMap(false); }}
                    className={locationButtonClass(showDeliveryMap)}>
                    <Map className="h-3.5 w-3.5" />
                    {showDeliveryMap ? "Close map" : "Pick on map"}
                  </button>
                </div>
                {showDeliveryMap && (
                  <LocationPicker
                    onSelect={(lat, lng, label) => {
                      setDeliveryLat(lat); setDeliveryLng(lng);
                      setForm((f) => ({ ...f, deliveryLocation: label }));
                      setShowDeliveryMap(false);
                    }}
                  />
                )}
              </div>

              {/* Weight + Date */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="weight" className="text-[#1c3a13]">Produce Weight (kg) *</Label>
                  <Input
                    id="weight"
                    type="number"
                    min={1}
                    step={0.5}
                    value={weightKg}
                    onChange={(e) => setWeightKg(parseFloat(e.target.value) || 1)}
                    required
                    className="bg-[#fcfcf7] border-[#eeeee9] text-[#1c3a13] rounded-lg"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="date" className="text-[#1c3a13]">Scheduled Date *</Label>
                  <Input
                    id="date"
                    type="datetime-local"
                    value={form.scheduledDate}
                    onChange={(e) => setForm((f) => ({ ...f, scheduledDate: e.target.value }))}
                    required
                    className="bg-[#fcfcf7] border-[#eeeee9] text-[#1c3a13] rounded-lg"
                  />
                </div>
              </div>

              {/* Fare estimate */}
              {fareEstimate && (
                <div className="rounded-2xl border border-[#eeeee9] bg-[#fcfcf7] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#1c3a13]">
                        System estimate: {formatCurrency(fareEstimate.total)}
                      </p>
                      <p className="text-xs text-[#1c3a13]/50 mt-0.5">
                        {haversineDistance(pickupLat!, pickupLng!, deliveryLat!, deliveryLng!).toFixed(1)} km ·{" "}
                        {weightKg} kg · ~{fareEstimate.etaMinutes} min ETA
                      </p>
                    </div>
                    <div className="text-2xl font-bold text-[#1c3a13]">
                      GHS {fareEstimate.total.toFixed(2)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 border-t border-[#eeeee9] pt-3">
                    <input
                      type="checkbox"
                      id="customPrice"
                      checked={customPrice}
                      onChange={(e) => setCustomPrice(e.target.checked)}
                      className="h-4 w-4 rounded text-[#1c3a13] border-[#eeeee9]"
                    />
                    <label htmlFor="customPrice" className="text-sm text-[#1c3a13]/70 cursor-pointer">
                      Set my own price (for negotiation)
                    </label>
                  </div>
                  {customPrice && (
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-[#1c3a13]/70">Your offer (GHS)</span>
                      <Input
                        type="number"
                        min={1}
                        step={0.5}
                        placeholder={fareEstimate.total.toFixed(2)}
                        value={offerPrice}
                        onChange={(e) => setOfferPrice(e.target.value)}
                        className="w-32 text-center font-semibold bg-[#fcfcf7] border-[#eeeee9] text-[#1c3a13] rounded-lg"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              <div className="space-y-1.5">
                <Label htmlFor="notes" className="text-[#1c3a13]">Notes (optional)</Label>
                <Input
                  id="notes"
                  placeholder="Produce type, special handling..."
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className="bg-[#fcfcf7] border-[#eeeee9] text-[#1c3a13] rounded-lg"
                />
              </div>

              <div className="flex gap-3">
                <Button type="submit" disabled={loading} className="flex-1 rounded-full bg-[#1c3a13] text-[#fcfcf7] hover:bg-[#2a5219]">
                  {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting…</> : "Submit Request"}
                </Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); resetForm(); }} className="rounded-full border-[#eeeee9] text-[#1c3a13] hover:bg-[#eeeee9]">
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Existing requests */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium text-[#1c3a13]">My Requests</h2>
          <span className="text-sm text-[#1c3a13]/50">{requests.length} total</span>
        </div>

        {loadingRequests ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[#1c3a13]/40" />
          </div>
        ) : requests.length === 0 ? (
          <Card className="bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl">
            <CardContent className="py-12 text-center text-[#1c3a13]/50">
              <Truck className="h-10 w-10 mx-auto mb-3 text-[#c4c7c4]" />
              <p className="font-light">No transport requests yet</p>
              <p className="text-sm mt-1">Create a request to find nearby riders</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <Card key={req.id} className="bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-2">
                      {/* Title row */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-[#1c3a13]">
                          {req.order?.listing.cropType ?? "General Transport"}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[req.status] ?? "bg-[#eeeee9] text-[#1c3a13]"}`}>
                          {req.status.replace("_", " ")}
                        </span>
                      </div>

                      {/* Locations */}
                      <div className="flex items-start gap-2 text-sm text-[#1c3a13]/70">
                        <MapPin className="h-3.5 w-3.5 text-[#1c3a13]/40 mt-0.5 flex-shrink-0" />
                        <span className="truncate">{req.pickupLocation}</span>
                        <span className="text-[#1c3a13]/30 flex-shrink-0">→</span>
                        <MapPin className="h-3.5 w-3.5 text-[#1c3a13]/40 mt-0.5 flex-shrink-0" />
                        <span className="truncate">{req.deliveryLocation}</span>
                      </div>

                      {/* Meta row */}
                      <div className="flex items-center gap-4 text-xs text-[#1c3a13]/50 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(req.scheduledDate)}
                        </span>
                        {req.weightKg && (
                          <span className="flex items-center gap-1">
                            <Weight className="h-3 w-3" />
                            {req.weightKg} kg
                          </span>
                        )}
                        {req.estimatedCost && (
                          <span className="flex items-center gap-1 font-semibold text-[#1c3a13]">
                            <DollarSign className="h-3 w-3" />
                            Offered: {formatCurrency(req.estimatedCost)}
                          </span>
                        )}
                        {req.provider && (
                          <span className="flex items-center gap-1 text-[#1c3a13] font-medium">
                            🏍️ {req.provider.user.name}
                          </span>
                        )}
                      </div>

                      {req.provider && req.estimatedCost && req.status !== "CANCELLED" && (
                        <TransportPaymentPanel
                          requestId={req.id}
                          estimatedCost={req.estimatedCost}
                          paymentStatus={req.paymentStatus}
                          paymentMethod={req.paymentMethod}
                          onUpdated={fetchRequests}
                        />
                      )}
                    </div>

                    {/* Cancel button */}
                    {req.status === "PENDING" && (
                      <button
                        onClick={() => cancelRequest(req.id)}
                        disabled={cancelling === req.id}
                        className="shrink-0 inline-flex items-center gap-1 rounded-full border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                      >
                        {cancelling === req.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5" />
                        )}
                        Cancel
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function FarmerTransportPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-[#1c3a13]/40" /></div>}>
      <TransportContent />
    </Suspense>
  );
}
