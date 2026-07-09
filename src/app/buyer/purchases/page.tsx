"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { History, Package, Loader2, Store, ShoppingCart, Radio, Star } from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";

type VendorOrderItem = {
  id: string;
  quantity: number;
  subtotal: number;
  product: { name: string; unit: string };
};

type VendorOrder = {
  id: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  vendor: { shopName: string; location: string };
  items: VendorOrderItem[];
};

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-[#eeeee9] text-[#1c3a13]",
  CONFIRMED: "bg-[#eeeee9] text-[#1c3a13]",
  PROCESSING: "bg-[#eeeee9] text-[#1c3a13]",
  SHIPPED: "bg-[#eeeee9] text-[#1c3a13]",
  DELIVERED: "bg-[#d3fa99] text-[#1c3a13]",
  CANCELLED: "bg-red-100 text-red-700",
};

type Tab = "equipment" | "produce";

const POLL_MS = 20_000;

export default function BuyerPurchasesPage() {
  const [vendorOrders, setVendorOrders] = useState<VendorOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("produce");
  const [changedIds, setChangedIds] = useState<Set<string>>(new Set());
  const prevStatusRef = useRef<Record<string, string>>({});

  const fetchVendorOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/vendor/orders");
      const d = await res.json();
      const incoming: VendorOrder[] = d.orders ?? [];

      const prev = prevStatusRef.current;
      const changed = new Set<string>();
      for (const o of incoming) {
        if (prev[o.id] && prev[o.id] !== o.status) changed.add(o.id);
        prev[o.id] = o.status;
      }
      if (changed.size > 0) {
        setChangedIds(changed);
        setTimeout(() => setChangedIds(new Set()), 3000);
      }

      setVendorOrders(incoming);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchVendorOrders(); }, [fetchVendorOrders]);

  useEffect(() => {
    const id = setInterval(() => fetchVendorOrders(), POLL_MS);
    return () => clearInterval(id);
  }, [fetchVendorOrders]);

  async function cancelEquipmentOrder(id: string) {
    if (!confirm("Cancel this order?")) return;
    await fetch(`/api/vendor/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CANCELLED" }),
    });
    setVendorOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: "CANCELLED" } : o));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-light tracking-tight text-[#1c3a13] flex items-center gap-2">
            <History className="h-6 w-6 text-[#1c3a13]" />
            Purchase History
          </h1>
          <p className="text-[#1c3a13]/50 text-sm mt-1">All your orders across the platform</p>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-[#1c3a13] font-medium mt-1">
          <Radio className="h-3.5 w-3.5 animate-pulse" />
          Live
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(["produce", "equipment"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${tab === t ? "bg-[#1c3a13] text-[#fcfcf7]" : "border border-[#eeeee9] text-[#1c3a13]/70 hover:bg-[#eeeee9]"}`}
          >
            {t === "produce" ? "Produce Orders" : "Equipment Orders"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-[#1c3a13]/40" /></div>
      ) : tab === "produce" ? (
        <Card className="bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl">
          <CardContent className="py-12 text-center">
            <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-[#1c3a13]/40" />
            <p className="text-[#1c3a13]/50 mb-2">Your produce orders appear in My Orders.</p>
            <a href="/buyer/orders" className="text-[#1c3a13] hover:underline text-sm">View My Orders →</a>
          </CardContent>
        </Card>
      ) : vendorOrders.length === 0 ? (
        <Card className="bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl">
          <CardContent className="py-16 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-[#1c3a13]/40" />
            <p className="text-[#1c3a13]/50 mb-4">No equipment purchases yet.</p>
            <a href="/equipment" className="inline-flex items-center gap-1.5 rounded-full bg-[#1c3a13] px-4 py-2 text-sm font-medium text-[#fcfcf7] hover:bg-[#2a5219] transition-colors">
              <Store className="h-4 w-4" /> Browse Equipment
            </a>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {vendorOrders.map((order) => (
            <Card key={order.id} className={`bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl transition-colors ${changedIds.has(order.id) ? "ring-2 ring-[#d3fa99] animate-pulse" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <p className="text-xs font-mono text-[#1c3a13]/40">#{order.id.slice(-8).toUpperCase()}</p>
                    <p className="text-sm font-medium text-[#1c3a13] flex items-center gap-1 mt-0.5">
                      <Store className="h-3.5 w-3.5" />
                      {order.vendor.shopName}
                    </p>
                  </div>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${STATUS_STYLES[order.status] ?? "bg-[#eeeee9] text-[#1c3a13]"}`}>
                    {order.status}
                  </span>
                </div>
                <div className="space-y-1 mb-3">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-[#1c3a13]/70">{item.product.name} × {item.quantity}</span>
                      <span className="text-[#1c3a13]/70">{formatCurrency(item.subtotal)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-[#eeeee9]">
                  <span className="text-xs text-[#1c3a13]/40">{formatDate(order.createdAt)}</span>
                  <span className="font-bold text-[#1c3a13]">{formatCurrency(order.totalAmount)}</span>
                </div>
                {order.status === "PENDING" && (
                  <button
                    onClick={() => cancelEquipmentOrder(order.id)}
                    className="mt-3 w-full rounded-full border border-red-200 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Cancel Order
                  </button>
                )}
                {order.status === "DELIVERED" && (
                  <Link
                    href={`/review/${order.id}?type=vendor`}
                    className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-full border border-[#1c3a13] py-2 text-sm text-[#1c3a13] hover:bg-[#eeeee9] transition-colors"
                  >
                    <Star className="h-3.5 w-3.5" />
                    Rate this order
                  </Link>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
