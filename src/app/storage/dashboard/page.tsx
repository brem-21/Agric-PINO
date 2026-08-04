"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DollarSign, Package, Clock, PackageCheck, Warehouse, ArrowRight, TrendingDown, ShoppingCart,
} from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { VerificationStatusCard } from "@/components/shared/verification-status-card";
import { AiStorageTipsCard } from "@/components/shared/ai-storage-tips-card";
import { lossColorClass } from "@/lib/post-harvest-loss";

type VerificationStatus = {
  isVerified: boolean;
  verifiedAt: string | null;
  latestRequest: { status: "PENDING" | "APPROVED" | "REJECTED" } | null;
};

type Analytics = {
  totalCommissionEarnings: number;
  totalSalesFacilitated: number;
  activeListings: number;
  pendingBookings: number;
  confirmedBookings: number;
  inStorageBookings: number;
  pendingOrders: number;
  lossPercentage: number | null;
};

export default function StorageDashboardPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [verification, setVerification] = useState<VerificationStatus | null>(null);
  const [hasProfile, setHasProfile] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/storage/analytics")
      .then((r) => {
        if (r.status === 404) { setHasProfile(false); return null; }
        return r.json();
      })
      .then((d) => d && setAnalytics(d.analytics))
      .finally(() => setLoading(false));
    fetch("/api/verification")
      .then((r) => r.json())
      .then(setVerification)
      .catch(() => {});
  }, []);

  if (loading) {
    return <div className="py-24 text-center text-[#1c3a13]/40">Loading…</div>;
  }

  if (!hasProfile) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 space-y-4">
        <Warehouse className="h-12 w-12 mx-auto text-[#1c3a13]/30" />
        <h1 className="text-xl font-light tracking-tight text-[#1c3a13]">Set up your facility</h1>
        <p className="text-[#1c3a13]/50 text-sm">
          Add your facility&apos;s location, storage type, and accepted crops so farmers can find and book it.
        </p>
        <Button asChild className="rounded-full bg-[#1c3a13] text-[#fcfcf7] hover:bg-[#2a5219]">
          <Link href="/storage/profile">Set Up Facility Profile <ArrowRight className="h-4 w-4 ml-2" /></Link>
        </Button>
      </div>
    );
  }

  if (!analytics) {
    return <div className="text-center py-16 text-[#1c3a13]/50">Failed to load analytics.</div>;
  }

  const stats = [
    { label: "Commission Earned", value: formatCurrency(analytics.totalCommissionEarnings), icon: DollarSign, iconBg: "bg-[#d3fa99]" },
    { label: "Sales Facilitated", value: formatCurrency(analytics.totalSalesFacilitated), icon: Package, iconBg: "bg-[#eeeee9]" },
    { label: "In Storage", value: analytics.activeListings, icon: PackageCheck, iconBg: "bg-[#eeeee9]" },
    { label: "Pending Bookings", value: analytics.pendingBookings, icon: Clock, iconBg: "bg-[#eeeee9]" },
    { label: "Orders to Fulfil", value: analytics.pendingOrders, icon: ShoppingCart, iconBg: "bg-[#eeeee9]" },
    {
      label: "Post-Harvest Loss",
      caption: "Share of value lost across everything held on behalf of farmers",
      value: analytics.lossPercentage === null ? "—" : formatPercent(analytics.lossPercentage),
      icon: TrendingDown,
      iconBg: lossColorClass(analytics.lossPercentage),
    },
  ];

  return (
    <div className="space-y-6">
      {verification && (
        <VerificationStatusCard
          isVerified={verification.isVerified}
          verifiedAt={verification.verifiedAt}
          latestRequestStatus={verification.latestRequest?.status ?? null}
        />
      )}
      <div>
        <h1 className="text-2xl font-light tracking-tight text-[#1c3a13]">Storage Facility Dashboard</h1>
        <p className="text-[#1c3a13]/50 text-sm mt-1">Your facility earns 5% commission on produce sold while in your care</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map(({ label, caption, value, icon: Icon, iconBg }) => (
          <Card key={label} className="bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl">
            <CardContent className="p-4">
              <div className={`inline-flex p-2 rounded-lg ${iconBg} text-[#1c3a13] mb-3`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-2xl font-bold text-[#1c3a13]">{value}</p>
              <p className="text-xs text-[#1c3a13]/50 mt-0.5">{label}</p>
              {caption && <p className="text-xs text-[#1c3a13]/40 mt-1">{caption}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap">
        <Button asChild variant="outline" className="rounded-full border-[#eeeee9] text-[#1c3a13] hover:bg-[#eeeee9]">
          <Link href="/storage/orders">View Orders</Link>
        </Button>
        <Button asChild variant="outline" className="rounded-full border-[#eeeee9] text-[#1c3a13] hover:bg-[#eeeee9]">
          <Link href="/storage/bookings">Review Bookings</Link>
        </Button>
        <Button asChild variant="outline" className="rounded-full border-[#eeeee9] text-[#1c3a13] hover:bg-[#eeeee9]">
          <Link href="/storage/inventory">View Inventory</Link>
        </Button>
      </div>

      <AiStorageTipsCard />
    </div>
  );
}
