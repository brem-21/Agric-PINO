"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingUp, ShoppingBag, Package, Truck, Clock, CheckCircle, XCircle, Loader2, Store,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { VerificationStatusCard } from "@/components/shared/verification-status-card";

type VerificationStatus = {
  isVerified: boolean;
  verifiedAt: string | null;
  latestRequest: { status: "PENDING" | "APPROVED" | "REJECTED"; paymentStatus: "UNPAID" | "PAID" | "REFUNDED" } | null;
};

type Analytics = {
  totalRevenue: number;
  totalOrders: number;
  pendingOrders: number;
  confirmedOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  topProducts: { productId: string; name: string; category: string; qty: number; revenue: number }[];
};

const CATEGORY_LABELS: Record<string, string> = {
  EQUIPMENT: "Equipment", SEEDS: "Seeds", FERTILIZERS: "Fertilizers",
  PESTICIDES: "Pesticides", TOOLS: "Tools", IRRIGATION: "Irrigation",
  ANIMAL_FEED: "Animal Feed", STORAGE: "Storage", OTHER: "Other",
};

export default function VendorDashboardPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [verification, setVerification] = useState<VerificationStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/vendor/analytics")
      .then((r) => r.json())
      .then((d) => setAnalytics(d.analytics))
      .finally(() => setLoading(false));
    fetch("/api/verification")
      .then((r) => r.json())
      .then(setVerification)
      .catch(() => {});
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-[#1c3a13]" />
      </div>
    );
  }

  if (!analytics) {
    return <div className="text-center py-16 text-[#1c3a13]/50">Failed to load analytics.</div>;
  }

  const stats = [
    { label: "Total Revenue", value: formatCurrency(analytics.totalRevenue), icon: TrendingUp, iconBg: "bg-[#d3fa99]" },
    { label: "Total Orders", value: analytics.totalOrders, icon: ShoppingBag, iconBg: "bg-[#eeeee9]" },
    { label: "Pending", value: analytics.pendingOrders, icon: Clock, iconBg: "bg-[#eeeee9]" },
    { label: "Delivered", value: analytics.deliveredOrders, icon: CheckCircle, iconBg: "bg-[#eeeee9]" },
    { label: "In Progress", value: analytics.confirmedOrders + analytics.shippedOrders, icon: Truck, iconBg: "bg-[#eeeee9]" },
    { label: "Cancelled", value: analytics.cancelledOrders, icon: XCircle, iconBg: "bg-red-100" },
  ];

  return (
    <div className="space-y-6">
      {verification && (
        <VerificationStatusCard
          isVerified={verification.isVerified}
          verifiedAt={verification.verifiedAt}
          latestRequestStatus={verification.latestRequest?.status ?? null}
          latestRequestPaymentStatus={verification.latestRequest?.paymentStatus ?? null}
        />
      )}
      <div>
        <h1 className="text-2xl font-light tracking-tight text-[#1c3a13]">Vendor Dashboard</h1>
        <p className="text-[#1c3a13]/50 text-sm mt-1">Your shop performance overview</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map(({ label, value, icon: Icon, iconBg }) => (
          <Card key={label} className="bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl">
            <CardContent className="p-4">
              <div className={`inline-flex p-2 rounded-lg ${iconBg} text-[#1c3a13] mb-3`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-2xl font-bold text-[#1c3a13]">{value}</p>
              <p className="text-xs text-[#1c3a13]/50 mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Top products */}
      <Card className="bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2 text-[#1c3a13]">
            <Package className="h-5 w-5 text-[#1c3a13]" />
            Top Selling Products
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analytics.topProducts.length === 0 ? (
            <div className="text-center py-8 text-[#1c3a13]/40">
              <Store className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No sales yet. Products sold will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {analytics.topProducts.map((p, i) => (
                <div key={p.productId} className="flex items-center gap-3">
                  <span className="text-sm font-bold text-[#1c3a13]/40 w-5 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1c3a13] truncate">{p.name}</p>
                    <p className="text-xs text-[#1c3a13]/50">{CATEGORY_LABELS[p.category] ?? p.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-[#1c3a13]">{p.qty} sold</p>
                    <p className="text-xs text-[#1c3a13]/50">{formatCurrency(p.revenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
