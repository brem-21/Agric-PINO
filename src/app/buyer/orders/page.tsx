"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { ShoppingBag, Package, ExternalLink, RefreshCw, Radio, Star, Truck, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "warning" | "success" | "outline"> = {
  PENDING: "warning",
  CONFIRMED: "default",
  PROCESSING: "default",
  READY_FOR_PICKUP: "success",
  IN_TRANSIT: "outline",
  DELIVERED: "success",
  CANCELLED: "destructive",
};

type Order = {
  id: string;
  deliveryNumber: string | null;
  quantity: number;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  fulfillmentType: "PICKUP" | "DELIVERY";
  createdAt: string;
  listing: { cropType: string; unit: string; images: string[] };
  farmer: {
    name: string;
    farmerProfile: { farmName: string | null; location: string | null } | null;
  };
  payment: { method: string; status: string } | null;
};

const POLL_MS = 20_000;

export default function BuyerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [changedIds, setChangedIds] = useState<Set<string>>(new Set());
  const prevStatusRef = useRef<Record<string, string>>({});

  const fetchOrders = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch("/api/orders");
      if (!res.ok) return;
      const data = await res.json();
      const incoming: Order[] = data.orders ?? [];

      // Detect status changes since last fetch
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

      setOrders(incoming);
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Auto-poll
  useEffect(() => {
    const id = setInterval(() => fetchOrders(), POLL_MS);
    return () => clearInterval(id);
  }, [fetchOrders]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light tracking-tight text-[#1c3a13]">My Orders</h1>
          <p className="text-[#1c3a13]/50 text-sm mt-1">
            {loading ? " " : `${orders.length} order${orders.length !== 1 ? "s" : ""} total`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Live indicator */}
          <span className="hidden sm:flex items-center gap-1.5 text-xs text-[#1c3a13] font-medium">
            <Radio className="h-3.5 w-3.5 animate-pulse" />
            Live
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchOrders(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/marketplace">
              <ShoppingBag className="h-3.5 w-3.5 mr-1.5" />
              Browse
            </Link>
          </Button>
        </div>
      </div>

      {lastUpdated && (
        <p className="text-xs text-[#1c3a13]/40">
          Updated {lastUpdated.toLocaleTimeString()} · refreshes every {POLL_MS / 1000}s
        </p>
      )}

      <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <RefreshCw className="h-6 w-6 animate-spin text-[#1c3a13]/40" />
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center">
            <div className="flex justify-center mb-4">
              <Package className="h-12 w-12 text-[#1c3a13]/40" />
            </div>
            <h3 className="text-lg font-medium text-[#1c3a13] mb-2">No orders yet</h3>
            <p className="text-[#1c3a13]/50 text-sm mb-4">
              Browse the marketplace to find fresh produce from farmers.
            </p>
            <Button asChild>
              <Link href="/marketplace">Browse Produce</Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#eeeee9] bg-[#eeeee9]">
                  <th className="text-left px-6 py-3 font-medium text-[#1c3a13]">Produce</th>
                  <th className="text-left px-6 py-3 font-medium text-[#1c3a13]">Farm</th>
                  <th className="text-right px-6 py-3 font-medium text-[#1c3a13]">Qty</th>
                  <th className="text-right px-6 py-3 font-medium text-[#1c3a13]">Amount</th>
                  <th className="text-left px-6 py-3 font-medium text-[#1c3a13]">Fulfillment</th>
                  <th className="text-left px-6 py-3 font-medium text-[#1c3a13]">Status</th>
                  <th className="text-left px-6 py-3 font-medium text-[#1c3a13]">Payment</th>
                  <th className="text-left px-6 py-3 font-medium text-[#1c3a13]">Date</th>
                  <th className="text-right px-6 py-3 font-medium text-[#1c3a13]">Track</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eeeee9]">
                {orders.map((order) => {
                  const highlighted = changedIds.has(order.id);
                  return (
                    <tr
                      key={order.id}
                      className={`transition-colors ${
                        highlighted
                          ? "bg-[#d3fa99] animate-pulse"
                          : "hover:bg-[#eeeee9]"
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {order.listing.images[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={order.listing.images[0]}
                              alt={order.listing.cropType}
                              className="h-10 w-10 rounded-lg object-cover border border-[#eeeee9] flex-shrink-0"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-lg bg-[#eeeee9] flex items-center justify-center flex-shrink-0">
                              <Package className="h-5 w-5 text-[#1c3a13]/40" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-[#1c3a13]">{order.listing.cropType}</p>
                            {order.deliveryNumber && (
                              <p className="text-xs text-[#1c3a13]/40 font-mono">{order.deliveryNumber}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[#1c3a13]/70">
                        <p>{order.farmer.farmerProfile?.farmName ?? order.farmer.name}</p>
                        {order.farmer.farmerProfile?.location && (
                          <p className="text-xs text-[#1c3a13]/40">{order.farmer.farmerProfile.location}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-[#1c3a13]/70">
                        {order.quantity} {order.listing.unit}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-[#1c3a13]">
                        {formatCurrency(order.totalAmount)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1c3a13]/70">
                          {order.fulfillmentType === "PICKUP" ? (
                            <><Store className="h-3.5 w-3.5" />Pickup</>
                          ) : (
                            <><Truck className="h-3.5 w-3.5" />Delivery</>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={STATUS_VARIANT[order.status] ?? "secondary"}>
                          {order.status.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        {order.payment ? (
                          <div>
                            <p className="text-xs font-medium text-[#1c3a13]">
                              {order.payment.method === "CASH" ? "Cash on Delivery" : "Mobile Money"}
                            </p>
                            <p className={`text-xs ${order.payment.status === "PAID" ? "text-[#1c3a13]" : "text-amber-600"}`}>
                              {order.payment.status}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-[#1c3a13]/40">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-[#1c3a13]/50">{formatDate(order.createdAt)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {order.status === "DELIVERED" && (
                            <Button variant="outline" size="sm" asChild className="rounded-full border-[#eeeee9] text-[#1c3a13] hover:bg-[#eeeee9]">
                              <Link href={`/review/${order.id}`}>
                                <Star className="h-3.5 w-3.5 mr-1" />
                                Rate
                              </Link>
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/delivery/${order.id}`}>
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
