"use client";

import { OffersList } from "@/components/shared/offers-list";

export default function FarmerOffersPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-light tracking-tight text-[#1c3a13]">Offers</h1>
        <p className="text-[#1c3a13]/50 text-sm mt-1">Negotiated offers buyers have sent on your listings</p>
      </div>
      <OffersList role="FARMER" />
    </div>
  );
}
