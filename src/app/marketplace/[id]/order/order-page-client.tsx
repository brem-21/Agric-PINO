"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  ShoppingCart,
  MapPin,
  Package,
  Calendar,
  Loader2,
  AlertCircle,
  Truck,
  Store,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ProductImageSlideshow } from "@/components/shared/product-image-slideshow";
import { PaymentChoicePanel } from "@/components/shared/payment-choice-panel";

const CATEGORY_EMOJI: Record<string, string> = {
  VEGETABLES: "🥦",
  GRAINS: "🌾",
  TUBERS: "🍠",
  FRUITS: "🍎",
  LEGUMES: "🫘",
  LIVESTOCK: "🐄",
};

interface Listing {
  id: string;
  cropType: string;
  category: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  currency: string;
  description: string | null;
  images: string[];
  harvestDate: string | null;
  expiryDate: string | null;
  location: string;
  status: string;
  farmer: {
    id: string;
    name: string;
    farmerProfile: { farmName: string; location: string; acceptsCOD: boolean } | null;
  };
}

export function OrderPageClient({ listingId }: { listingId: string }) {
  const { data: session } = useSession();
  const isVerified = !!session?.user?.isVerified;
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");
  const [fulfillmentType, setFulfillmentType] = useState<"PICKUP" | "DELIVERY">("DELIVERY");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/listings/${listingId}`)
      .then((r) => r.json())
      .then((d) => { setListing(d.listing ?? null); setLoading(false); })
      .catch(() => setLoading(false));
  }, [listingId]);

  async function placeOrder() {
    if (!listing || placing) return;
    setPlacing(true);
    setError("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: listing.id,
          quantity: qty,
          notes: notes || undefined,
          fulfillmentType,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to place order."); return; }
      setPlacedOrderId(data.order.id);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPlacing(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fcfcf7] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#1c3a13]/40" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-[#fcfcf7] flex flex-col items-center justify-center gap-4 text-center p-6">
        <AlertCircle className="h-12 w-12 text-[#1c3a13]/20" />
        <h2 className="text-lg font-light tracking-tight text-[#1c3a13]">Listing not found</h2>
        <Button asChild variant="outline"><Link href="/marketplace">Back to Marketplace</Link></Button>
      </div>
    );
  }

  const isActive = listing.status === "ACTIVE";
  const totalAmount = qty * listing.pricePerUnit;
  const farmName = listing.farmer.farmerProfile?.farmName ?? listing.farmer.name;
  const acceptsCOD = listing.farmer.farmerProfile?.acceptsCOD ?? true;

  return (
    <div className="min-h-screen bg-[#fcfcf7]">
      {/* Header */}
      <div className="bg-[#fcfcf7] border-b border-[#eeeee9] sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="text-[#1c3a13]/60 hover:text-[#1c3a13] -ml-2">
            <Link href={`/marketplace/${listingId}`}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Link>
          </Button>
          <h1 className="font-medium text-[#1c3a13] tracking-tight">Place Order</h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-5">
        {/* Listing summary card */}
        <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] overflow-hidden">
          <div className="flex gap-4 p-5">
            <div className="h-24 w-24 rounded-xl overflow-hidden flex-shrink-0 border border-[#eeeee9]">
              <ProductImageSlideshow
                images={listing.images}
                alt={listing.cropType}
                fallbackEmoji={CATEGORY_EMOJI[listing.category] ?? "🌿"}
                autoAdvanceMs={0}
                className="h-full w-full"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-medium text-[#1c3a13] text-lg tracking-tight">{listing.cropType}</h2>
              <p className="text-sm text-[#1c3a13]/50 mt-0.5">{farmName}</p>
              <div className="flex items-center gap-1.5 text-sm text-[#1c3a13]/50 mt-1.5">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{listing.farmer.farmerProfile?.location ?? listing.location}</span>
              </div>
              <p className="text-xl font-bold text-[#1c3a13] mt-2">
                {formatCurrency(listing.pricePerUnit)}
                <span className="text-sm font-normal text-[#1c3a13]/50"> / {listing.unit}</span>
              </p>
            </div>
          </div>
          <div className="border-t border-[#eeeee9] px-5 py-3 flex items-center gap-4 text-xs text-[#1c3a13]/50 bg-[#eeeee9]">
            <span className="flex items-center gap-1">
              <Package className="h-3.5 w-3.5" />
              {listing.quantity} {listing.unit} available
            </span>
            {listing.harvestDate && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Harvested {formatDate(listing.harvestDate)}
              </span>
            )}
          </div>
        </div>

        {/* Order form */}
        {placedOrderId ? (
          <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] p-6">
            <PaymentChoicePanel
              orderId={placedOrderId}
              totalAmount={totalAmount}
              farmerName={listing.farmer.name}
              acceptsCOD={acceptsCOD}
            />
          </div>
        ) : (
          <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] p-6 space-y-5">
            <h3 className="font-medium text-[#1c3a13] tracking-tight">Order Details</h3>

            {!isActive && (
              <div className="flex items-center gap-2 rounded-xl bg-[#eeeee9] border border-[#eeeee9] px-4 py-3 text-sm text-[#1c3a13]">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                This listing is no longer available.
              </div>
            )}

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-[#1c3a13] mb-1.5">
                Quantity ({listing.unit})
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-[#eeeee9] text-[#1c3a13] hover:bg-[#eeeee9] disabled:opacity-40 transition-colors"
                  disabled={qty <= 1}
                >
                  −
                </button>
                <input
                  type="number"
                  min={1}
                  max={listing.quantity}
                  value={qty}
                  onChange={(e) => {
                    const v = Math.max(1, Math.min(listing.quantity, Number(e.target.value) || 1));
                    setQty(v);
                  }}
                  className="w-20 rounded-lg border border-[#eeeee9] bg-[#fcfcf7] px-3 py-2 text-center text-sm font-medium text-[#1c3a13] focus:border-[#1c3a13] focus:outline-none focus:ring-2 focus:ring-[#1c3a13]/20"
                />
                <button
                  onClick={() => setQty((q) => Math.min(listing.quantity, q + 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-[#eeeee9] text-[#1c3a13] hover:bg-[#eeeee9] disabled:opacity-40 transition-colors"
                  disabled={qty >= listing.quantity}
                >
                  +
                </button>
                <span className="text-sm text-[#1c3a13]/40">of {listing.quantity} {listing.unit}</span>
              </div>
            </div>

            {/* Fulfillment */}
            <div>
              <label className="block text-sm font-medium text-[#1c3a13] mb-1.5">
                How will you get your produce?
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFulfillmentType("DELIVERY")}
                  className={`flex items-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-colors ${
                    fulfillmentType === "DELIVERY"
                      ? "border-[#1c3a13] bg-[#d3fa99] text-[#1c3a13]"
                      : "border-[#eeeee9] text-[#1c3a13]/60 hover:border-[#1c3a13]/40"
                  }`}
                >
                  <Truck className="h-4 w-4 flex-shrink-0" />
                  Delivery
                </button>
                <button
                  type="button"
                  onClick={() => setFulfillmentType("PICKUP")}
                  className={`flex items-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-colors ${
                    fulfillmentType === "PICKUP"
                      ? "border-[#1c3a13] bg-[#d3fa99] text-[#1c3a13]"
                      : "border-[#eeeee9] text-[#1c3a13]/60 hover:border-[#1c3a13]/40"
                  }`}
                >
                  <Store className="h-4 w-4 flex-shrink-0" />
                  Pickup
                </button>
              </div>
              <p className="text-xs text-[#1c3a13]/40 mt-1.5">
                {fulfillmentType === "PICKUP"
                  ? "You'll collect the produce yourself from the farmer's location — no transport is arranged."
                  : "The farmer will arrange transport to deliver your produce."}
              </p>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-[#1c3a13] mb-1.5">
                Notes <span className="font-normal text-[#1c3a13]/40">(optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Delivery instructions, special requests…"
                rows={3}
                maxLength={500}
                className="w-full resize-none rounded-xl border border-[#eeeee9] bg-[#fcfcf7] px-4 py-3 text-sm text-[#1c3a13] placeholder:text-[#1c3a13]/40 focus:border-[#1c3a13] focus:outline-none focus:ring-2 focus:ring-[#1c3a13]/20 transition-colors"
              />
            </div>

            {/* Order summary */}
            <div className="rounded-2xl bg-[#eeeee9] border border-[#eeeee9] p-4 space-y-2">
              <div className="flex justify-between text-sm text-[#1c3a13]/70">
                <span>{qty} {listing.unit} × {formatCurrency(listing.pricePerUnit)}</span>
                <span className="font-medium text-[#1c3a13]">{formatCurrency(totalAmount)}</span>
              </div>
              <div className="border-t border-[#1c3a13]/10 pt-2 flex justify-between font-medium text-[#1c3a13]">
                <span>Total</span>
                <span className="text-lg font-bold">{formatCurrency(totalAmount)}</span>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {!isVerified && (
              <div className="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                <ShieldAlert className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div>
                  Verify your account before placing orders.{" "}
                  <Link href="/verification" className="font-medium underline hover:no-underline">
                    Apply for verification
                  </Link>
                </div>
              </div>
            )}

            <Button
              size="lg"
              className="w-full text-base"
              disabled={!isActive || placing || !isVerified}
              onClick={placeOrder}
            >
              {placing ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Placing order…</>
              ) : (
                <><ShoppingCart className="h-4 w-4 mr-2" />Place Order — {formatCurrency(totalAmount)}</>
              )}
            </Button>
            <p className="text-center text-xs text-[#1c3a13]/40">
              Payment is arranged with the farmer after confirmation.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
