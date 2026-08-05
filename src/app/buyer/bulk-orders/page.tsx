"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Loader2, Package, Plus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";

interface ChildOrder {
  id: string;
  quantity: number;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  listing: { unit: string };
  farmer: { id: string; name: string; farmerProfile: { farmName: string | null } | null };
}

interface BulkOrder {
  id: string;
  cropType: string;
  totalQuantity: number;
  totalAmount: number;
  createdAt: string;
  orders: ChildOrder[];
}

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-[#eeeee9] text-[#1c3a13]",
  CONFIRMED: "bg-[#eeeee9] text-[#1c3a13]",
  PROCESSING: "bg-[#eeeee9] text-[#1c3a13]",
  READY_FOR_PICKUP: "bg-amber-100 text-amber-800",
  IN_TRANSIT: "bg-amber-100 text-amber-800",
  DELIVERED: "bg-[#d3fa99] text-[#1c3a13]",
  CANCELLED: "bg-red-100 text-red-700",
};

export default function BulkOrdersPage() {
  const [bulkOrders, setBulkOrders] = useState<BulkOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBulkOrders = useCallback(async () => {
    const res = await fetch("/api/bulk-orders");
    if (res.ok) setBulkOrders((await res.json()).bulkOrders ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchBulkOrders(); }, [fetchBulkOrders]);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light tracking-tight text-[#1c3a13]">Bulk Orders</h1>
          <p className="text-[#1c3a13]/50 text-sm mt-1">One purchase, aggregated across as many farmers as it took to fill it.</p>
        </div>
        <Button asChild className="rounded-full bg-[#1c3a13] hover:bg-[#2a5219] text-[#fcfcf7]">
          <Link href="/buyer/bulk-order/new"><Plus className="h-4 w-4 mr-1.5" />New Bulk Order</Link>
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-[#1c3a13]/40" /></div>
      ) : bulkOrders.length === 0 ? (
        <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] py-16 text-center">
          <Package className="h-10 w-10 mx-auto mb-3 text-[#c4c7c4]" />
          <p className="text-[#1c3a13]/50 font-light">No bulk orders yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bulkOrders.map((bo) => {
            const deliveredCount = bo.orders.filter((o) => o.status === "DELIVERED").length;
            return (
              <div key={bo.id} className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-[#1c3a13]">{bo.cropType}</p>
                    <p className="text-xs text-[#1c3a13]/50">
                      {bo.totalQuantity.toLocaleString()} total · {formatCurrency(bo.totalAmount)} · {bo.orders.length} farmer(s) · {formatDate(bo.createdAt)}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-[#1c3a13] flex-shrink-0">
                    {deliveredCount} of {bo.orders.length} delivered
                  </span>
                </div>

                <div className="divide-y divide-[#eeeee9] border-t border-[#eeeee9]">
                  {bo.orders.map((o) => (
                    <Link key={o.id} href={`/tracking/${o.id}`} className="flex items-center justify-between gap-3 py-2 hover:bg-[#eeeee9] rounded-lg px-2 transition-colors">
                      <span className="text-sm text-[#1c3a13]">
                        {o.farmer.farmerProfile?.farmName ?? o.farmer.name} — {o.quantity} {o.listing.unit}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[o.status] ?? "bg-[#eeeee9] text-[#1c3a13]"}`}>
                          {o.status.replace(/_/g, " ")}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-[#1c3a13]/30" />
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
