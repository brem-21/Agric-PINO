"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingBag, Loader2, RefreshCw, User, Package, Radio } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

type OrderItem = {
  id: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  product: { name: string; unit: string; category: string };
};

type VendorOrder = {
  id: string;
  status: string;
  totalAmount: number;
  deliveryAddress: string | null;
  notes: string | null;
  createdAt: string;
  customer: { name: string; phone: string };
  items: OrderItem[];
};

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-[#eeeee9] text-[#1c3a13]",
  CONFIRMED: "bg-[#eeeee9] text-[#1c3a13]",
  PROCESSING: "bg-[#eeeee9] text-[#1c3a13]",
  SHIPPED: "bg-[#eeeee9] text-[#1c3a13]",
  DELIVERED: "bg-[#d3fa99] text-[#1c3a13]",
  CANCELLED: "bg-red-100 text-red-800",
};

const NEXT_STATUS: Record<string, { label: string; status: string }> = {
  PENDING: { label: "Confirm Order", status: "CONFIRMED" },
  CONFIRMED: { label: "Mark Processing", status: "PROCESSING" },
  PROCESSING: { label: "Mark Shipped", status: "SHIPPED" },
  SHIPPED: { label: "Mark Delivered", status: "DELIVERED" },
};

export default function VendorOrdersPage() {
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/vendor/orders");
    const data = await res.json();
    setOrders(data.orders ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // Auto-poll for new orders and status changes
  useEffect(() => {
    const id = setInterval(() => fetchOrders(), 20_000);
    return () => clearInterval(id);
  }, [fetchOrders]);

  async function updateStatus(orderId: string, status: string) {
    setActing(orderId);
    await fetch(`/api/vendor/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await fetchOrders();
    setActing(null);
  }

  const active = orders.filter((o) => !["DELIVERED", "CANCELLED"].includes(o.status));
  const completed = orders.filter((o) => ["DELIVERED", "CANCELLED"].includes(o.status));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light tracking-tight text-[#1c3a13]">Orders</h1>
          <p className="text-[#1c3a13]/50 text-sm mt-1">{active.length} active · {completed.length} completed</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:flex items-center gap-1.5 text-xs text-[#1c3a13] font-medium">
            <Radio className="h-3.5 w-3.5 animate-pulse" />
            Live
          </span>
          <button
            onClick={fetchOrders}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#eeeee9] px-3 py-2 text-sm text-[#1c3a13]/70 hover:bg-[#eeeee9] disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-[#1c3a13]" /></div>
      ) : orders.length === 0 ? (
        <Card className="bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl">
          <CardContent className="py-16 text-center">
            <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-[#1c3a13]/40" />
            <p className="text-[#1c3a13]/50">No orders yet.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {active.length > 0 && (
            <section>
              <h2 className="text-lg font-medium text-[#1c3a13] mb-3">Active Orders</h2>
              <div className="space-y-4">
                {active.map((order) => <OrderCard key={order.id} order={order} onAction={updateStatus} acting={acting} />)}
              </div>
            </section>
          )}
          {completed.length > 0 && (
            <section>
              <h2 className="text-lg font-medium text-[#1c3a13] mb-3">Completed</h2>
              <div className="space-y-4">
                {completed.map((order) => <OrderCard key={order.id} order={order} onAction={updateStatus} acting={acting} />)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function OrderCard({ order, onAction, acting }: { order: VendorOrder; onAction: (id: string, status: string) => void; acting: string | null }) {
  const next = NEXT_STATUS[order.status];

  return (
    <Card className="bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl border-l-4 border-l-[#1c3a13]">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-mono text-[#1c3a13]/50">#{order.id.slice(-8).toUpperCase()}</CardTitle>
          <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${STATUS_STYLES[order.status] ?? "bg-[#eeeee9] text-[#1c3a13]"}`}>
            {order.status}
          </span>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        <div className="flex items-center gap-2 text-sm text-[#1c3a13]/70">
          <User className="h-4 w-4 text-[#1c3a13]/40" />
          <span>{order.customer.name}</span>
          <span className="text-[#1c3a13]/40">·</span>
          <span className="text-[#1c3a13]/50">{order.customer.phone}</span>
        </div>
        <div className="space-y-1">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Package className="h-3.5 w-3.5 text-[#1c3a13]/40" />
                <span className="text-[#1c3a13]">{item.product.name}</span>
                <span className="text-[#1c3a13]/40">× {item.quantity}</span>
              </div>
              <span className="text-[#1c3a13]/70">{formatCurrency(item.subtotal)}</span>
            </div>
          ))}
        </div>
        {order.deliveryAddress && (
          <p className="text-xs text-[#1c3a13]/50">Deliver to: {order.deliveryAddress}</p>
        )}
        <div className="flex items-center justify-between pt-2 border-t border-[#eeeee9]">
          <span className="text-xs text-[#1c3a13]/40">{formatDate(order.createdAt)}</span>
          <span className="font-bold text-[#1c3a13]">{formatCurrency(order.totalAmount)}</span>
        </div>
        {next && (
          <button
            onClick={() => onAction(order.id, next.status)}
            disabled={acting === order.id}
            className="w-full rounded-full bg-[#1c3a13] py-2 text-sm font-semibold text-[#fcfcf7] hover:bg-[#2a5219] transition-colors disabled:opacity-60"
          >
            {acting === order.id ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : next.label}
          </button>
        )}
      </CardContent>
    </Card>
  );
}
