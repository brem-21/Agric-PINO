"use client";

import { OffersList } from "@/components/shared/offers-list";

export default function BuyerOffersPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-light tracking-tight text-[#1c3a13]">My Offers</h1>
        <p className="text-[#1c3a13]/50 text-sm mt-1">Negotiated prices you&apos;ve sent to farmers</p>
      </div>
      <OffersList role="BUYER" />
    </div>
  );
}
