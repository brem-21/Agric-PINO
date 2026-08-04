"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Loader2, Handshake, CheckCircle2, XCircle, RefreshCw, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDate } from "@/lib/utils";

type OfferStatus = "PENDING" | "COUNTERED" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "CANCELLED";

interface OfferItem {
  id: string;
  quantity: number;
  pricePerUnit: number;
  message: string | null;
  status: OfferStatus;
  lastActionBy: "BUYER" | "FARMER";
  expiresAt: string;
  orderId: string | null;
  listing: { id: string; cropType: string; unit: string; images: string[]; pricePerUnit: number };
  buyer: { id: string; name: string; phone: string };
  farmer: { id: string; name: string; phone: string };
}

const STATUS_STYLES: Record<OfferStatus, string> = {
  PENDING: "bg-[#eeeee9] text-[#1c3a13]",
  COUNTERED: "bg-amber-100 text-amber-800",
  ACCEPTED: "bg-[#d3fa99] text-[#1c3a13]",
  REJECTED: "bg-red-100 text-red-700",
  EXPIRED: "bg-[#eeeee9] text-[#1c3a13]/50",
  CANCELLED: "bg-[#eeeee9] text-[#1c3a13]/50",
};

const POLL_MS = 15_000;

export function OffersList({ role }: { role: "BUYER" | "FARMER" }) {
  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [counterOpen, setCounterOpen] = useState<string | null>(null);
  const [counterQty, setCounterQty] = useState("");
  const [counterPrice, setCounterPrice] = useState("");
  const [error, setError] = useState<Record<string, string>>({});

  const fetchOffers = useCallback(async () => {
    try {
      const res = await fetch("/api/offers");
      if (res.ok) setOffers((await res.json()).offers ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOffers(); }, [fetchOffers]);
  useEffect(() => {
    const id = setInterval(fetchOffers, POLL_MS);
    return () => clearInterval(id);
  }, [fetchOffers]);

  async function act(offerId: string, action: "accept" | "reject" | "cancel" | "counter", body?: Record<string, unknown>) {
    setActing(offerId);
    setError((prev) => ({ ...prev, [offerId]: "" }));
    try {
      const res = await fetch(`/api/offers/${offerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...body }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError((prev) => ({ ...prev, [offerId]: data.error ?? "Action failed" }));
        return;
      }
      setCounterOpen(null);
      fetchOffers();
    } finally {
      setActing(null);
    }
  }

  function openCounter(offer: OfferItem) {
    setCounterOpen(offer.id);
    setCounterQty(String(offer.quantity));
    setCounterPrice(String(offer.pricePerUnit));
  }

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-[#1c3a13]/40" /></div>;
  }

  if (offers.length === 0) {
    return (
      <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] py-16 text-center">
        <Handshake className="h-10 w-10 mx-auto mb-3 text-[#c4c7c4]" />
        <p className="text-[#1c3a13]/50 font-light">
          {role === "BUYER" ? "No offers made yet — try one from a listing." : "No offers received yet."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {offers.map((offer) => {
        const counterpart = role === "BUYER" ? offer.farmer : offer.buyer;
        const isMyTurn = offer.lastActionBy !== role;
        const isActive = offer.status === "PENDING" || offer.status === "COUNTERED";

        return (
          <div key={offer.id} className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] p-4 space-y-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-11 w-11 rounded-xl overflow-hidden flex-shrink-0 bg-[#eeeee9] flex items-center justify-center text-xl">
                  {offer.listing.images[0]
                    ? // eslint-disable-next-line @next/next/no-img-element
                      <img src={offer.listing.images[0]} alt="" className="h-full w-full object-cover" />
                    : "🌿"}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-[#1c3a13] truncate">{offer.listing.cropType}</p>
                  <p className="text-xs text-[#1c3a13]/50">
                    {role === "BUYER" ? "To" : "From"} {counterpart.name}
                  </p>
                </div>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${STATUS_STYLES[offer.status]}`}>
                {offer.status}
              </span>
            </div>

            <div className="rounded-xl bg-[#eeeee9] px-3 py-2 flex items-center justify-between text-sm">
              <span className="text-[#1c3a13]/70">
                {offer.quantity} {offer.listing.unit} @ {formatCurrency(offer.pricePerUnit)}/{offer.listing.unit}
              </span>
              <span className="font-semibold text-[#1c3a13]">{formatCurrency(offer.quantity * offer.pricePerUnit)}</span>
            </div>

            {offer.message && <p className="text-sm text-[#1c3a13]/60 italic">&ldquo;{offer.message}&rdquo;</p>}

            <div className="flex items-center gap-1.5 text-xs text-[#1c3a13]/40">
              <Clock className="h-3 w-3" />
              {isActive
                ? isMyTurn
                  ? <span className="font-medium text-[#1c3a13]">Your turn — expires {formatDate(offer.expiresAt)}</span>
                  : <span>Waiting on {counterpart.name} — expires {formatDate(offer.expiresAt)}</span>
                : offer.orderId
                  ? (
                    <Link href={role === "BUYER" ? "/buyer/orders" : "/farmer/orders"} className="text-[#1c3a13] font-medium hover:underline flex items-center gap-1">
                      View order <ArrowRight className="h-3 w-3" />
                    </Link>
                  )
                  : <span>Closed {formatDate(offer.expiresAt)}</span>}
            </div>

            {error[offer.id] && <p className="text-xs text-red-600">{error[offer.id]}</p>}

            {isActive && (
              <div className="flex flex-wrap gap-2 pt-1 border-t border-[#eeeee9]">
                {isMyTurn ? (
                  <>
                    <Button size="sm" disabled={acting === offer.id} onClick={() => act(offer.id, "accept")}
                      className="rounded-full bg-[#1c3a13] hover:bg-[#2a5219] text-[#fcfcf7]">
                      {acting === offer.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
                      Accept
                    </Button>
                    <Button size="sm" variant="outline" disabled={acting === offer.id} onClick={() => openCounter(offer)}
                      className="rounded-full border-[#eeeee9] text-[#1c3a13] hover:bg-[#eeeee9]">
                      <RefreshCw className="h-3.5 w-3.5 mr-1" />
                      Counter
                    </Button>
                    <Button size="sm" variant="outline" disabled={acting === offer.id} onClick={() => act(offer.id, "reject")}
                      className="rounded-full border-red-200 text-red-600 hover:bg-red-50">
                      <XCircle className="h-3.5 w-3.5 mr-1" />
                      Decline
                    </Button>
                  </>
                ) : role === "BUYER" ? (
                  <Button size="sm" variant="outline" disabled={acting === offer.id} onClick={() => act(offer.id, "cancel")}
                    className="rounded-full border-red-200 text-red-600 hover:bg-red-50">
                    <XCircle className="h-3.5 w-3.5 mr-1" />
                    Cancel Offer
                  </Button>
                ) : null}
              </div>
            )}

            {counterOpen === offer.id && (
              <div className="flex flex-wrap items-end gap-2 pt-2 border-t border-[#eeeee9]">
                <div className="space-y-1">
                  <p className="text-xs text-[#1c3a13]/50">Quantity</p>
                  <Input type="number" min={1}
                    value={counterQty} onChange={(e) => setCounterQty(e.target.value)}
                    className="w-24 h-8 text-sm bg-[#fcfcf7] border-[#eeeee9] text-[#1c3a13] rounded-lg" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-[#1c3a13]/50">Price/unit</p>
                  <Input type="number" min={0.01} step={0.01}
                    value={counterPrice} onChange={(e) => setCounterPrice(e.target.value)}
                    className="w-24 h-8 text-sm bg-[#fcfcf7] border-[#eeeee9] text-[#1c3a13] rounded-lg" />
                </div>
                <Button size="sm" disabled={acting === offer.id}
                  onClick={() => act(offer.id, "counter", { quantity: parseFloat(counterQty), pricePerUnit: parseFloat(counterPrice) })}
                  className="rounded-full bg-[#1c3a13] hover:bg-[#2a5219] text-[#fcfcf7] h-8">
                  Send Counter
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setCounterOpen(null)} className="h-8 text-[#1c3a13]/60">
                  Cancel
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
