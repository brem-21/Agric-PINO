"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles, X, ShoppingCart, Loader2, Plus, Minus, MapPin, ArrowRight, CheckCircle, AlertCircle,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useCart } from "@/components/shared/cart-context";

interface WidgetRecommendation {
  id: string;
  cropType: string;
  category: string;
  pricePerUnit: number;
  unit: string;
  quantity: number;
  location: string;
  image: string | null;
  farmName: string;
  rating: number;
  distKm: number;
}

const INACTIVITY_MS = 60_000;
// UserEvents (views, clicks, location updates) keep changing what's relevant,
// so the widget periodically re-pulls fresh picks in the background.
const REFRESH_MS = 2 * 60_000;

export function RecommendationsPane() {
  const router = useRouter();
  const { items, count, total, addItem, updateQuantity, removeItem, clearCart } = useCart();

  const [recommendations, setRecommendations] = useState<WidgetRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [checkoutDone, setCheckoutDone] = useState(false);

  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => setOpen(false), INACTIVITY_MS);
  }, []);

  const fetchRecommendations = useCallback((autoOpen: boolean) => {
    return fetch("/api/recommendations/widget")
      .then((r) => (r.ok ? r.json() : { recommendations: [] }))
      .then((d) => {
        const recs = d.recommendations ?? [];
        setRecommendations(recs);
        if (autoOpen && recs.length > 0) setOpen(true);
      })
      .catch(() => {});
  }, []);

  // Initial load
  useEffect(() => {
    fetchRecommendations(true).finally(() => setLoading(false));
  }, [fetchRecommendations]);

  // Background refresh every 2 minutes — never forces the pane open or closed,
  // it just keeps the underlying picks current with the buyer's latest activity.
  useEffect(() => {
    const interval = setInterval(() => fetchRecommendations(false), REFRESH_MS);
    return () => clearInterval(interval);
  }, [fetchRecommendations]);

  useEffect(() => {
    if (!open) return;
    resetInactivityTimer();
    return () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [open, resetInactivityTimer]);

  if (loading || dismissed || recommendations.length === 0) return null;

  function handleAddToCart(rec: WidgetRecommendation) {
    addItem({
      listingId: rec.id,
      cropType: rec.cropType,
      image: rec.image,
      pricePerUnit: rec.pricePerUnit,
      unit: rec.unit,
      maxQuantity: rec.quantity,
      farmName: rec.farmName,
    });
    resetInactivityTimer();
  }

  async function handleCheckout() {
    setCheckingOut(true);
    setCheckoutError("");
    try {
      const results = await Promise.all(
        items.map((item) =>
          fetch("/api/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ listingId: item.listingId, quantity: item.quantity }),
          }).then((r) => ({ ok: r.ok, listingId: item.listingId }))
        )
      );
      const failed = results.filter((r) => !r.ok);
      const succeeded = results.filter((r) => r.ok).map((r) => r.listingId);
      succeeded.forEach((id) => removeItem(id));

      if (failed.length === 0) {
        setCheckoutDone(true);
        setTimeout(() => {
          setCheckoutDone(false);
          router.push("/buyer/orders");
        }, 1500);
      } else {
        setCheckoutError(`${succeeded.length} order(s) placed, ${failed.length} failed. Try again for the rest.`);
      }
    } catch {
      setCheckoutError("Network error placing your order(s). Please try again.");
    } finally {
      setCheckingOut(false);
      resetInactivityTimer();
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); resetInactivityTimer(); }}
        className="fixed right-4 top-1/2 -translate-y-1/2 z-40 flex items-center gap-1.5 rounded-full bg-[#1c3a13] text-[#fcfcf7] pl-3 pr-4 py-2.5 text-sm font-medium shadow-lg hover:bg-[#2a5219] transition-colors"
        title="Recommended for you"
      >
        <Sparkles className="h-4 w-4" />
        {count > 0 ? `Cart (${count})` : "For You"}
      </button>
    );
  }

  return (
    <div
      onClick={resetInactivityTimer}
      onMouseEnter={resetInactivityTimer}
      className="fixed right-4 top-20 bottom-4 z-40 w-80 max-w-[calc(100vw-2rem)] flex flex-col bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl shadow-xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#eeeee9] bg-[#1c3a13] text-[#fcfcf7] flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-[#d3fa99]" />
          <span className="font-medium text-sm">Recommended for You</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setOpen(false)}
            className="p-1 rounded-full hover:bg-white/10 transition-colors"
            title="Minimize"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded-full hover:bg-white/10 transition-colors"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Recommended products */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {recommendations.map((rec) => {
          const inCart = items.find((i) => i.listingId === rec.id);
          return (
            <div key={rec.id} className="flex gap-2.5 rounded-xl border border-[#eeeee9] p-2.5">
              <div className="h-14 w-14 rounded-lg overflow-hidden bg-[#eeeee9] flex-shrink-0">
                {rec.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={rec.image} alt={rec.cropType} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-lg">🌾</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#1c3a13] truncate">{rec.cropType}</p>
                <p className="text-xs text-[#1c3a13]/50 truncate">{rec.farmName}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs font-semibold text-[#1c3a13]">
                    {formatCurrency(rec.pricePerUnit)}/{rec.unit}
                  </span>
                  {rec.distKm > 0 && (
                    <span className="flex items-center gap-0.5 text-[10px] text-[#1c3a13]/40">
                      <MapPin className="h-2.5 w-2.5" />
                      {rec.distKm}km
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleAddToCart(rec)}
                disabled={!!inCart}
                className="self-center flex-shrink-0 flex items-center justify-center h-7 w-7 rounded-full bg-[#d3fa99] text-[#1c3a13] hover:bg-[#c8f57a] disabled:opacity-40 disabled:cursor-default transition-colors"
                title={inCart ? "Already in cart" : "Add to cart"}
              >
                {inCart ? <CheckCircle className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              </button>
            </div>
          );
        })}
      </div>

      {/* Cart */}
      {items.length > 0 && (
        <div className="border-t border-[#eeeee9] p-3 space-y-2 flex-shrink-0 bg-[#eeeee9]/40">
          <div className="flex items-center gap-1.5 text-xs font-medium text-[#1c3a13]">
            <ShoppingCart className="h-3.5 w-3.5" />
            Your Cart ({count})
          </div>
          <div className="max-h-28 overflow-y-auto space-y-1.5">
            {items.map((item) => (
              <div key={item.listingId} className="flex items-center gap-2 text-xs">
                <span className="flex-1 truncate text-[#1c3a13]">{item.cropType}</span>
                <button
                  onClick={() => updateQuantity(item.listingId, item.quantity - 1)}
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-[#fcfcf7] border border-[#eeeee9] text-[#1c3a13]"
                >
                  <Minus className="h-2.5 w-2.5" />
                </button>
                <span className="w-4 text-center text-[#1c3a13] font-medium">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.listingId, item.quantity + 1)}
                  disabled={item.quantity >= item.maxQuantity}
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-[#fcfcf7] border border-[#eeeee9] text-[#1c3a13] disabled:opacity-30"
                >
                  <Plus className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}
          </div>

          {checkoutError && (
            <div className="flex items-center gap-1.5 rounded-lg bg-red-50 border border-red-100 px-2 py-1.5 text-[11px] text-red-700">
              <AlertCircle className="h-3 w-3 flex-shrink-0" />
              {checkoutError}
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-semibold text-[#1c3a13]">Total: {formatCurrency(total)}</span>
            <button
              onClick={handleCheckout}
              disabled={checkingOut || checkoutDone}
              className="inline-flex items-center gap-1 rounded-full bg-[#1c3a13] text-[#fcfcf7] px-3 py-1.5 text-xs font-medium hover:bg-[#2a5219] disabled:opacity-60 transition-colors"
            >
              {checkoutDone ? (
                <><CheckCircle className="h-3.5 w-3.5" />Ordered!</>
              ) : checkingOut ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                "Checkout"
              )}
            </button>
          </div>
          <button onClick={clearCart} className="text-[10px] text-[#1c3a13]/40 hover:text-[#1c3a13]/70">
            Clear cart
          </button>
        </div>
      )}

      {/* Footer */}
      <Link
        href="/marketplace"
        className="flex items-center justify-center gap-1.5 border-t border-[#eeeee9] py-2.5 text-xs font-medium text-[#1c3a13] hover:bg-[#eeeee9] transition-colors flex-shrink-0"
      >
        Browse Full Marketplace
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
