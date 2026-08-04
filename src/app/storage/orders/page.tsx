"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { FileText, Radio, RefreshCw, Truck, Store, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";

type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "READY_FOR_PICKUP"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "CANCELLED";

const STATUS_VARIANT: Record<OrderStatus, "default" | "secondary" | "destructive" | "warning" | "success" | "outline"> = {
  PENDING: "warning",
  CONFIRMED: "default",
  PROCESSING: "default",
  READY_FOR_PICKUP: "success",
  IN_TRANSIT: "outline",
  DELIVERED: "success",
  CANCELLED: "destructive",
};

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  PENDING: "CONFIRMED",
  CONFIRMED: "PROCESSING",
  PROCESSING: "READY_FOR_PICKUP",
};

const NEXT_STATUS_LABEL: Partial<Record<OrderStatus, string>> = {
  PENDING: "Confirm Order",
  CONFIRMED: "Start Processing",
  PROCESSING: "Mark Ready for Pickup",
};

// "Mark done" — a facility can close out an order directly (e.g. the buyer
// collected in person) without necessarily routing it through a tracked
// TransportRequest first.
const CAN_MARK_DELIVERED: Partial<Record<OrderStatus, true>> = {
  READY_FOR_PICKUP: true,
  IN_TRANSIT: true,
};

const PAYMENT_VARIANT: Record<string, "default" | "secondary" | "destructive" | "success"> = {
  UNPAID: "secondary",
  PAID: "success",
  REFUNDED: "destructive",
};

type Order = {
  id: string;
  quantity: number;
  totalAmount: number;
  status: OrderStatus;
  paymentStatus: string;
  fulfillmentType: "PICKUP" | "DELIVERY";
  createdAt: string;
  listing: { cropType: string; unit: string };
  buyer: { name: string; phone: string; buyerProfile: { businessName: string | null } | null };
  farmer: { name: string; phone: string; farmerProfile: { farmName: string } | null };
  transportRequest: { id: string; status: string } | null;
};

const POLL_MS = 20_000;

export default function StorageOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
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

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  useEffect(() => {
    const id = setInterval(() => fetchOrders(), POLL_MS);
    return () => clearInterval(id);
  }, [fetchOrders]);

  async function updateStatus(orderId: string, status: OrderStatus) {
    setActing(orderId);
    try {
      await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      await fetchOrders();
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light tracking-tight text-[#1c3a13]">Orders</h1>
          <p className="text-[#1c3a13]/50 text-sm mt-1">
            {loading ? " " : `${orders.length} order${orders.length !== 1 ? "s" : ""} for produce held at your facility`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:flex items-center gap-1.5 text-xs text-[#1c3a13] font-medium">
            <Radio className="h-3.5 w-3.5 animate-pulse" />
            Live
          </span>
          <Button variant="outline" size="sm" onClick={() => fetchOrders(true)} disabled={refreshing} className="rounded-full border-[#eeeee9] text-[#1c3a13] hover:bg-[#eeeee9]">
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {lastUpdated && (
        <p className="text-xs text-[#1c3a13]/40">
          Updated {lastUpdated.toLocaleTimeString()} · refreshes every {POLL_MS / 1000}s · every action here notifies the farmer
        </p>
      )}

      <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <RefreshCw className="h-6 w-6 animate-spin text-[#1c3a13]/40" />
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-5xl mb-4" role="img">📦</div>
            <h3 className="text-lg font-light tracking-tight text-[#1c3a13] mb-2">No orders yet</h3>
            <p className="text-[#1c3a13]/50 text-sm">Orders for produce held at your facility will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#eeeee9] bg-[#eeeee9]">
                  <th className="text-left px-6 py-3 font-medium text-[#1c3a13]">Farmer</th>
                  <th className="text-left px-6 py-3 font-medium text-[#1c3a13]">Buyer</th>
                  <th className="text-left px-6 py-3 font-medium text-[#1c3a13]">Produce</th>
                  <th className="text-right px-6 py-3 font-medium text-[#1c3a13]">Quantity</th>
                  <th className="text-right px-6 py-3 font-medium text-[#1c3a13]">Total</th>
                  <th className="text-left px-6 py-3 font-medium text-[#1c3a13]">Payment</th>
                  <th className="text-left px-6 py-3 font-medium text-[#1c3a13]">Status</th>
                  <th className="text-left px-6 py-3 font-medium text-[#1c3a13]">Date</th>
                  <th className="text-right px-6 py-3 font-medium text-[#1c3a13]">Action</th>
                  <th className="text-left px-6 py-3 font-medium text-[#1c3a13]">Delivery</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eeeee9]">
                {orders.map((order) => {
                  const nextStatus = NEXT_STATUS[order.status];
                  const nextLabel = NEXT_STATUS_LABEL[order.status];
                  const canMarkDelivered = CAN_MARK_DELIVERED[order.status];
                  const highlighted = changedIds.has(order.id);
                  return (
                    <tr
                      key={order.id}
                      className={`transition-colors ${highlighted ? "bg-[#d3fa99] animate-pulse" : "hover:bg-[#eeeee9]"}`}
                    >
                      <td className="px-6 py-4">
                        <p className="font-medium text-[#1c3a13]">
                          {order.farmer.farmerProfile?.farmName ?? order.farmer.name}
                        </p>
                        <p className="text-xs text-[#1c3a13]/40">{order.farmer.phone}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-[#1c3a13]">
                          {order.buyer.buyerProfile?.businessName ?? order.buyer.name}
                        </p>
                        <p className="text-xs text-[#1c3a13]/40">{order.buyer.phone}</p>
                      </td>
                      <td className="px-6 py-4 font-medium text-[#1c3a13]">{order.listing.cropType}</td>
                      <td className="px-6 py-4 text-right text-[#1c3a13]/70">
                        {order.quantity} {order.listing.unit}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-[#1c3a13]">
                        {formatCurrency(order.totalAmount)}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={PAYMENT_VARIANT[order.paymentStatus] ?? "secondary"}>
                          {order.paymentStatus}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={STATUS_VARIANT[order.status] ?? "secondary"}>
                          {order.status.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-[#1c3a13]/50">{formatDate(order.createdAt)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {nextStatus && nextLabel && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={acting === order.id}
                              onClick={() => updateStatus(order.id, nextStatus)}
                              className="rounded-full border-[#eeeee9] text-[#1c3a13] hover:bg-[#eeeee9]"
                            >
                              {acting === order.id ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : nextLabel}
                            </Button>
                          )}
                          {canMarkDelivered && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={acting === order.id}
                              onClick={() => updateStatus(order.id, "DELIVERED")}
                              className="rounded-full border-[#1c3a13] text-[#1c3a13] hover:bg-[#eeeee9]"
                            >
                              {acting === order.id ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : (
                                <><CheckCircle2 className="h-3.5 w-3.5 mr-1" />Mark Delivered</>
                              )}
                            </Button>
                          )}
                          {!nextStatus && !canMarkDelivered && (
                            <span className="text-xs text-[#1c3a13]/40">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {order.fulfillmentType === "PICKUP" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eeeee9] px-3 py-1.5 text-xs font-medium text-[#1c3a13]">
                            <Store className="h-3.5 w-3.5" />
                            Customer Pickup
                          </span>
                        ) : order.transportRequest ? (
                          <Link
                            href="/storage/transport"
                            className="inline-flex items-center gap-1.5 rounded-full bg-[#eeeee9] px-3 py-1.5 text-xs font-medium text-[#1c3a13] hover:bg-[#d3fa99] transition-colors"
                          >
                            <Truck className="h-3.5 w-3.5" />
                            {order.transportRequest.status.replace(/_/g, " ")}
                          </Link>
                        ) : order.paymentStatus === "PAID" ? (
                          <Link
                            href={`/storage/transport?orderId=${order.id}`}
                            className="inline-flex items-center gap-1.5 rounded-full border border-[#1c3a13] px-3 py-1.5 text-xs font-medium text-[#1c3a13] hover:bg-[#eeeee9] transition-colors"
                          >
                            <Truck className="h-3.5 w-3.5" />
                            Assign Delivery
                          </Link>
                        ) : (
                          <span className="text-xs text-[#1c3a13]/40">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/delivery/${order.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-full border border-[#1c3a13] px-3 py-1.5 text-xs font-medium text-[#1c3a13] hover:bg-[#eeeee9] transition-colors"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          Delivery Slip
                        </Link>
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
