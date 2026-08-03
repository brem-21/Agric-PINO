"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Package,
  Loader2,
  ShoppingCart,
  AlertCircle,
  BadgeCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProductImageSlideshow } from "@/components/shared/product-image-slideshow";
import { FollowButton } from "@/components/shared/follow-button";
import { QuickMessageDialog } from "@/components/shared/quick-message-dialog";
import { PaymentChoicePanel } from "@/components/shared/payment-choice-panel";
import { formatCurrency, formatDate, getSpoilageUrgency } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ListingDetail {
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
  createdAt: string;
  farmer: {
    id: string;
    name: string;
    image: string | null;
    region: string | null;
    district: string | null;
    farmerProfile: {
      farmName: string;
      location: string;
      rating: number;
      totalRatings: number;
      farmSize: number | null;
      description: string | null;
      acceptsCOD: boolean;
    } | null;
  };
  storageFacility: { id: string; name: string; location: string; storageTypes: string[] } | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const CATEGORY_EMOJI: Record<string, string> = {
  VEGETABLES: "🥦",
  GRAINS: "🌾",
  TUBERS: "🍠",
  FRUITS: "🍎",
  LEGUMES: "🫘",
  LIVESTOCK: "🐄",
};

const CATEGORY_LABEL: Record<string, string> = {
  VEGETABLES: "Vegetables",
  GRAINS: "Grains",
  TUBERS: "Tubers",
  FRUITS: "Fruits",
  LEGUMES: "Legumes",
  LIVESTOCK: "Livestock",
};

const CATEGORY_BADGE: Record<string, "default" | "secondary" | "warning" | "success" | "destructive" | "outline"> = {
  VEGETABLES: "success",
  GRAINS: "warning",
  TUBERS: "secondary",
  FRUITS: "default",
  LEGUMES: "outline",
  LIVESTOCK: "destructive",
};

function StarRating({ rating, total }: { rating: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex">
        {Array.from({ length: 5 }, (_, i) => {
          const filled = i < Math.floor(rating);
          const half = !filled && i < rating;
          return (
            <span
              key={i}
              className={`text-lg leading-none ${filled || half ? "text-amber-400" : "text-[#eeeee9]"}`}
            >
              {filled ? "★" : half ? "⯨" : "★"}
            </span>
          );
        })}
      </div>
      {total > 0 ? (
        <span className="text-sm text-[#1c3a13]/50">
          {rating.toFixed(1)} <span className="text-[#1c3a13]/40">({total} review{total !== 1 ? "s" : ""})</span>
        </span>
      ) : (
        <span className="text-sm text-[#1c3a13]/40">No reviews yet</span>
      )}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="min-h-screen bg-[#fcfcf7] animate-pulse">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="h-8 w-32 bg-[#eeeee9] rounded" />
        <div className="bg-[#fcfcf7] rounded-2xl overflow-hidden border border-[#eeeee9]">
          <div className="h-72 bg-[#eeeee9]" />
          <div className="p-6 space-y-4">
            <div className="h-7 bg-[#eeeee9] rounded w-1/2" />
            <div className="h-10 bg-[#eeeee9] rounded w-1/3" />
            <div className="h-4 bg-[#eeeee9] rounded w-full" />
            <div className="h-4 bg-[#eeeee9] rounded w-3/4" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function ListingDetailClient({ id }: { id: string }) {
  const { data: session } = useSession();
  const router = useRouter();

  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [qty, setQty] = useState(1);
  const [ordering, setOrdering] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/listings/${id}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      })
      .then((data) => {
        if (data?.listing) setListing(data.listing);
        else if (data) setNotFound(true);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  async function placeOrder() {
    if (!session) { router.push("/auth/login"); return; }
    if (!listing || ordering) return;
    setOrdering(true);
    setOrderError("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: listing.id, quantity: qty }),
      });
      const data = await res.json();
      if (!res.ok) { setOrderError(data.error ?? "Failed to place order"); return; }
      setPlacedOrderId(data.order.id);
    } catch {
      setOrderError("Network error. Please try again.");
    } finally {
      setOrdering(false);
    }
  }

  if (loading) return <Skeleton />;

  if (notFound || !listing) {
    return (
      <div className="min-h-screen bg-[#fcfcf7] flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <div className="text-5xl">🔍</div>
          <h2 className="text-xl font-light text-[#1c3a13] tracking-tight">Listing not found</h2>
          <p className="text-[#1c3a13]/50 text-sm">This listing may have been removed or is no longer available.</p>
          <Button asChild variant="outline" className="rounded-full border-[#eeeee9] text-[#1c3a13] hover:bg-[#eeeee9] hover:border-[#1c3a13]">
            <Link href="/marketplace">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Marketplace
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const fp = listing.farmer.farmerProfile;
  const isActive = listing.status === "ACTIVE";
  const totalCost = qty * listing.pricePerUnit;
  const acceptsCOD = fp?.acceptsCOD ?? true;
  const emoji = CATEGORY_EMOJI[listing.category] ?? "🌿";
  const initials = listing.farmer.name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2);
  const urgency = getSpoilageUrgency(listing.expiryDate);

  return (
    <div className="min-h-screen bg-[#fcfcf7]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* Back */}
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-1.5 text-sm text-[#1c3a13] hover:text-[#1c3a13] font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Marketplace
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ── Left / Main ── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Image slideshow */}
            <div className="bg-[#fcfcf7] rounded-2xl overflow-hidden border border-[#eeeee9]">
              <div className="h-72 sm:h-80 relative">
                <ProductImageSlideshow
                  images={listing.images}
                  alt={listing.cropType}
                  fallbackEmoji={emoji}
                  className="h-full w-full"
                  priority
                />
                {!isActive && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
                    <span className="rounded-full bg-[#fcfcf7]/90 px-4 py-1.5 text-sm font-medium text-[#1c3a13] uppercase tracking-wider">
                      {listing.status === "SOLD" ? "Sold Out" : listing.status === "EXPIRED" ? "Expired" : listing.status}
                    </span>
                  </div>
                )}
              </div>

              <div className="p-5 space-y-4">
                {/* Title row */}
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge variant={CATEGORY_BADGE[listing.category] ?? "default"}>
                        {CATEGORY_LABEL[listing.category] ?? listing.category}
                      </Badge>
                      {isActive && (
                        <span className="inline-flex items-center gap-1 text-xs text-[#1c3a13] font-medium">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#d3fa99] animate-pulse" />
                          Available
                        </span>
                      )}
                      {isActive && acceptsCOD && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#eeeee9] px-2 py-0.5 text-xs font-medium text-[#1c3a13]">
                          Cash on Delivery
                        </span>
                      )}
                    </div>
                    <h1 className="text-2xl font-light text-[#1c3a13] tracking-tight">{listing.cropType}</h1>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-[#1c3a13]">{formatCurrency(listing.pricePerUnit)}</p>
                    <p className="text-sm text-[#1c3a13]/50">per {listing.unit}</p>
                  </div>
                </div>

                {/* Description */}
                {listing.description && (
                  <p className="text-[#1c3a13]/70 text-sm leading-relaxed border-t border-[#eeeee9] pt-4">
                    {listing.description}
                  </p>
                )}

                {/* Details grid */}
                <div className="grid grid-cols-2 gap-3 border-t border-[#eeeee9] pt-4">
                  <div className="flex items-start gap-2.5">
                    <Package className="h-4 w-4 text-[#1c3a13] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-[#1c3a13]/40 uppercase tracking-wide font-medium">Available</p>
                      <p className="text-sm font-semibold text-[#1c3a13]">
                        {listing.quantity.toLocaleString()} {listing.unit}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <MapPin className="h-4 w-4 text-[#1c3a13] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-[#1c3a13]/40 uppercase tracking-wide font-medium">
                        {listing.storageFacility ? "Pickup Point" : "Location"}
                      </p>
                      <p className="text-sm font-semibold text-[#1c3a13] line-clamp-2">
                        {listing.storageFacility ? listing.storageFacility.name : listing.location}
                      </p>
                      {listing.storageFacility && (
                        <p className="text-xs text-[#1c3a13]/50">{listing.storageFacility.location}</p>
                      )}
                    </div>
                  </div>
                  {listing.harvestDate && (
                    <div className="flex items-start gap-2.5">
                      <Calendar className="h-4 w-4 text-[#1c3a13] mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-[#1c3a13]/40 uppercase tracking-wide font-medium">Harvested</p>
                        <p className="text-sm font-semibold text-[#1c3a13]">{formatDate(listing.harvestDate)}</p>
                      </div>
                    </div>
                  )}
                  {listing.expiryDate && (
                    <div className="flex items-start gap-2.5">
                      <Calendar className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-[#1c3a13]/40 uppercase tracking-wide font-medium">Best before</p>
                        <p className="text-sm font-semibold text-[#1c3a13]">{formatDate(listing.expiryDate)}</p>
                      </div>
                    </div>
                  )}
                </div>

                {urgency && (
                  <div
                    className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium ${
                      urgency.level === "critical"
                        ? "bg-red-50 border-red-200 text-red-700"
                        : urgency.level === "urgent"
                        ? "bg-amber-50 border-amber-200 text-amber-700"
                        : "bg-yellow-50 border-yellow-200 text-yellow-700"
                    }`}
                  >
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{urgency.label} — order soon to avoid this produce going to waste.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Farmer card */}
            <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] p-5 space-y-4">
              <h2 className="text-sm font-medium text-[#1c3a13]/50 uppercase tracking-wide">About the Farmer</h2>
              <div className="flex items-start gap-4">
                {listing.farmer.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={listing.farmer.image}
                    alt={listing.farmer.name}
                    className="h-14 w-14 rounded-full object-cover flex-shrink-0 ring-2 ring-[#eeeee9]"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-full bg-[#eeeee9] flex items-center justify-center flex-shrink-0 text-[#1c3a13] font-bold text-lg ring-2 ring-[#eeeee9]">
                    {initials}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-[#1c3a13]">{fp?.farmName ?? listing.farmer.name}</p>
                    <BadgeCheck className="h-4 w-4 text-[#1c3a13] flex-shrink-0" />
                  </div>
                  <p className="text-sm text-[#1c3a13]/50">{listing.farmer.name}</p>
                  {listing.farmer.region && (
                    <p className="text-xs text-[#1c3a13]/40 mt-0.5 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {listing.farmer.region}{listing.farmer.district ? `, ${listing.farmer.district}` : ""}
                    </p>
                  )}
                </div>
              </div>

              {fp && (
                <div className="space-y-2 pl-0">
                  <StarRating rating={fp.rating} total={fp.totalRatings} />
                  {fp.farmSize && (
                    <p className="text-sm text-[#1c3a13]/50">
                      Farm size: <span className="font-medium text-[#1c3a13]">{fp.farmSize} acres</span>
                    </p>
                  )}
                  {fp.description && (
                    <p className="text-sm text-[#1c3a13]/70 leading-relaxed">{fp.description}</p>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 pt-2 border-t border-[#eeeee9]">
                <FollowButton userId={listing.farmer.id} size="sm" />
                <QuickMessageDialog
                  recipientId={listing.farmer.id}
                  recipientName={listing.farmer.name}
                  trigger={
                    <Button variant="outline" size="sm"
                      className="rounded-full border-[#eeeee9] text-[#1c3a13] hover:bg-[#eeeee9] hover:border-[#1c3a13]">
                      <svg className="h-3.5 w-3.5 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      Message Farmer
                    </Button>
                  }
                />
              </div>
            </div>
          </div>

          {/* ── Right / Order panel ── */}
          <div className="space-y-4">
            <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] p-5 space-y-4 lg:sticky lg:top-6">
              <h2 className="font-medium text-[#1c3a13]">Place an Order</h2>

              {!isActive ? (
                <div className="rounded-2xl bg-[#eeeee9] border border-[#eeeee9] p-4 text-center space-y-2">
                  <AlertCircle className="h-8 w-8 text-[#1c3a13]/40 mx-auto" />
                  <p className="text-sm font-medium text-[#1c3a13]/70">
                    {listing.status === "SOLD" ? "This produce has sold out." : "This listing is no longer available."}
                  </p>
                  <Button variant="outline" asChild size="sm" className="rounded-full border-[#eeeee9] text-[#1c3a13] hover:bg-[#fcfcf7] hover:border-[#1c3a13] mt-2">
                    <Link href="/marketplace">Browse more</Link>
                  </Button>
                </div>
              ) : placedOrderId ? (
                <PaymentChoicePanel
                  orderId={placedOrderId}
                  totalAmount={totalCost}
                  farmerName={listing.farmer.name}
                  acceptsCOD={acceptsCOD}
                />
              ) : (
                <>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-[#1c3a13]/50 uppercase tracking-wide mb-1 block">
                        Quantity ({listing.unit})
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setQty((q) => Math.max(1, q - 1))}
                          className="h-9 w-9 rounded-lg border border-[#eeeee9] flex items-center justify-center text-[#1c3a13]/70 hover:border-[#1c3a13] hover:text-[#1c3a13] transition-colors"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={listing.quantity}
                          value={qty}
                          onChange={(e) => {
                            const v = parseInt(e.target.value) || 1;
                            setQty(Math.min(listing.quantity, Math.max(1, v)));
                          }}
                          className="flex-1 h-9 text-center border border-[#eeeee9] rounded-lg text-sm font-semibold text-[#1c3a13] bg-[#fcfcf7] focus:outline-none focus:ring-2 focus:ring-[#1c3a13] focus:border-[#1c3a13]"
                        />
                        <button
                          onClick={() => setQty((q) => Math.min(listing.quantity, q + 1))}
                          className="h-9 w-9 rounded-lg border border-[#eeeee9] flex items-center justify-center text-[#1c3a13]/70 hover:border-[#1c3a13] hover:text-[#1c3a13] transition-colors"
                        >
                          +
                        </button>
                      </div>
                      <p className="text-xs text-[#1c3a13]/40 mt-1">
                        Max: {listing.quantity.toLocaleString()} {listing.unit}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-[#eeeee9] border border-[#eeeee9] p-3 space-y-1.5">
                      <div className="flex justify-between text-sm text-[#1c3a13]/70">
                        <span>Unit price</span>
                        <span>{formatCurrency(listing.pricePerUnit)}/{listing.unit}</span>
                      </div>
                      <div className="flex justify-between text-sm text-[#1c3a13]/70">
                        <span>Quantity</span>
                        <span>{qty} {listing.unit}</span>
                      </div>
                      <div className="flex justify-between font-semibold text-[#1c3a13] border-t border-[#1c3a13]/10 pt-1.5 mt-1.5">
                        <span>Total</span>
                        <span className="font-bold">{formatCurrency(totalCost)}</span>
                      </div>
                    </div>
                  </div>

                  {orderError && (
                    <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-100 px-3 py-2.5 text-sm text-red-700">
                      <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      {orderError}
                    </div>
                  )}

                  <Button
                    onClick={placeOrder}
                    disabled={ordering || !session}
                    className="w-full bg-[#1c3a13] hover:bg-[#2a5219] text-[#fcfcf7] h-11 rounded-full"
                  >
                    {ordering ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <ShoppingCart className="h-4 w-4 mr-2" />
                    )}
                    {!session ? "Sign in to Order" : ordering ? "Placing order…" : "Place Order"}
                  </Button>

                  {!session && (
                    <p className="text-center text-xs text-[#1c3a13]/40">
                      <Link href="/auth/login" className="text-[#1c3a13] underline underline-offset-2">Sign in</Link> or{" "}
                      <Link href="/auth/register" className="text-[#1c3a13] underline underline-offset-2">register</Link> to order
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Quick info card */}
            <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] p-4 space-y-3">
              <h3 className="text-xs font-medium text-[#1c3a13]/40 uppercase tracking-wide">Listing info</h3>
              <div className="space-y-2 text-sm text-[#1c3a13]/70">
                <div className="flex justify-between">
                  <span className="text-[#1c3a13]/40">Listed</span>
                  <span>{formatDate(listing.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#1c3a13]/40">Category</span>
                  <span>{CATEGORY_LABEL[listing.category] ?? listing.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#1c3a13]/40">Currency</span>
                  <span>{listing.currency}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
