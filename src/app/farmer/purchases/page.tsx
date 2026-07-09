"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { History, Package, Loader2, Store, Star } from "lucide-react";
import Link from "next/link";
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
  createdAt: string;
  vendor: { shopName: string; location: string };
  items: OrderItem[];
};

const STATUS_STYLES: Record<string, string> = {
  PENDING:    "bg-[#eeeee9] text-[#1c3a13]",
  CONFIRMED:  "bg-[#eeeee9] text-[#1c3a13]",
  PROCESSING: "bg-[#eeeee9] text-[#1c3a13]",
  SHIPPED:    "bg-[#eeeee9] text-[#1c3a13]",
  DELIVERED:  "bg-[#d3fa99] text-[#1c3a13]",
  CANCELLED:  "bg-red-100 text-red-800",
};

export default function FarmerPurchasesPage() {
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/vendor/orders")
      .then((r) => r.json())
      .then((d) => setOrders(d.orders ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function cancelOrder(id: string) {
    if (!confirm("Cancel this order?")) return;
    await fetch(`/api/vendor/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CANCELLED" }),
    });
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: "CANCELLED" } : o));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-light tracking-tight text-[#1c3a13] flex items-center gap-2">
          <History className="h-6 w-6 text-[#1c3a13]" />
          My Equipment Purchases
        </h1>
        <p className="text-[#1c3a13]/50 text-sm mt-1">Orders placed in the equipment marketplace</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-[#1c3a13]/40" /></div>
      ) : orders.length === 0 ? (
        <Card className="bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl">
          <CardContent className="py-16 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-[#c4c7c4]" />
            <p className="text-[#1c3a13]/50 font-light mb-4">No purchases yet.</p>
            <a href="/equipment" className="inline-flex items-center gap-1.5 rounded-full bg-[#1c3a13] px-4 py-2 text-sm font-medium text-[#fcfcf7] hover:bg-[#2a5219] transition-colors">
              <Store className="h-4 w-4" /> Browse Equipment
            </a>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id} className="bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl">
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
                      <span className="text-[#1c3a13]/50">{formatCurrency(item.subtotal)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-[#eeeee9]">
                  <span className="text-xs text-[#1c3a13]/40">{formatDate(order.createdAt)}</span>
                  <span className="font-bold text-[#1c3a13]">{formatCurrency(order.totalAmount)}</span>
                </div>
                {order.status === "PENDING" && (
                  <button
                    onClick={() => cancelOrder(order.id)}
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
