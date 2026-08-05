"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, Package, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";

const REASON_LABEL: Record<string, string> = {
  NOT_FRESH: "Not fresh",
  WRONG_QUANTITY: "Wrong quantity",
  WRONG_ITEM: "Wrong item",
  DAMAGED: "Damaged",
  OTHER: "Other",
};

const STATUS_BADGE: Record<string, string> = {
  OPEN: "bg-red-100 text-red-700",
  RESOLVED_REFUNDED: "bg-[#d3fa99] text-[#1c3a13]",
  RESOLVED_REPLACEMENT: "bg-[#eeeee9] text-[#1c3a13]",
  RESOLVED_DENIED: "bg-[#eeeee9] text-[#1c3a13]/60",
};

const TABS = [
  { value: "OPEN", label: "Open" },
  { value: "", label: "All" },
];

interface Dispute {
  id: string;
  reason: string;
  description: string;
  photo: string | null;
  status: string;
  resolutionNote: string | null;
  createdAt: string;
  raisedBy: { id: string; name: string; phone: string };
  resolvedBy: { name: string } | null;
  order: {
    id: string;
    totalAmount: number;
    paymentStatus: string;
    createdAt: string;
    listing: { cropType: string; unit: string; images: string[] };
    farmer: { id: string; name: string; phone: string };
  };
}

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("OPEN");
  const [acting, setActing] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const fetchDisputes = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (tab) params.set("status", tab);
    const res = await fetch(`/api/admin/disputes?${params}`);
    const data = await res.json();
    setDisputes(data.disputes ?? []);
    setLoading(false);
  }, [tab]);

  useEffect(() => { fetchDisputes(); }, [fetchDisputes]);

  async function resolve(orderId: string, status: "RESOLVED_REFUNDED" | "RESOLVED_REPLACEMENT" | "RESOLVED_DENIED") {
    setActing(`${orderId}:${status}`);
    try {
      const res = await fetch(`/api/orders/${orderId}/dispute`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, resolutionNote: notes[orderId] }),
      });
      if (res.ok) fetchDisputes();
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-light tracking-tight text-[#1c3a13]">Order Disputes</h1>
        <p className="text-sm text-[#1c3a13]/50 mt-1">
          Buyers rejecting delivered produce — resolve with a refund, a replacement, or deny the claim.
        </p>
      </div>

      <div className="flex gap-1 bg-[#fcfcf7] border border-[#eeeee9] rounded-xl p-1 w-fit">
        {TABS.map((t) => (
          <button key={t.value} onClick={() => setTab(t.value)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.value ? "bg-[#1c3a13] text-[#fcfcf7]" : "text-[#1c3a13]/70 hover:bg-[#eeeee9] hover:text-[#1c3a13]"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-[#1c3a13]/40" /></div>
      ) : disputes.length === 0 ? (
        <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] py-20 text-center">
          <div className="text-5xl mb-3">✅</div>
          <p className="text-[#1c3a13]/50">{tab === "OPEN" ? "No open disputes." : "No disputes found."}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {disputes.map((d) => (
            <div key={d.id} className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] overflow-hidden">
              <div className="flex gap-4 p-5">
                <div className="h-16 w-16 rounded-xl overflow-hidden flex-shrink-0 bg-[#eeeee9] flex items-center justify-center border border-[#eeeee9]">
                  {d.order.listing.images[0]
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={d.order.listing.images[0]} alt="" className="h-full w-full object-cover" />
                    : <Package className="h-6 w-6 text-[#1c3a13]/40" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-medium text-[#1c3a13]">{d.order.listing.cropType}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[d.status] ?? "bg-[#eeeee9] text-[#1c3a13]"}`}>
                      {d.status.replace(/_/g, " ")}
                    </span>
                    <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> {REASON_LABEL[d.reason] ?? d.reason}
                    </span>
                  </div>
                  <p className="text-sm text-[#1c3a13]/70">{d.description}</p>
                  <p className="text-xs text-[#1c3a13]/40 mt-1.5">
                    {formatCurrency(d.order.totalAmount)} · Payment: {d.order.paymentStatus} · Filed {formatDate(d.createdAt)}
                  </p>
                  <p className="text-xs text-[#1c3a13]/40">
                    Buyer: {d.raisedBy.name} ({d.raisedBy.phone}) · Farmer: {d.order.farmer.name} ({d.order.farmer.phone})
                  </p>
                  {d.resolutionNote && (
                    <p className="text-xs text-[#1c3a13]/50 mt-1.5 italic">Resolution: {d.resolutionNote}{d.resolvedBy && ` — ${d.resolvedBy.name}`}</p>
                  )}
                </div>
              </div>

              {d.status === "OPEN" && (
                <div className="border-t border-[#eeeee9] px-5 py-3 bg-[#eeeee9] flex flex-wrap items-center gap-2">
                  <input
                    value={notes[d.order.id] ?? ""}
                    onChange={(e) => setNotes((prev) => ({ ...prev, [d.order.id]: e.target.value }))}
                    placeholder="Resolution note (optional)…"
                    className="flex-1 min-w-[180px] rounded-lg border border-[#eeeee9] bg-[#fcfcf7] px-3 py-1.5 text-sm focus:border-[#1c3a13] focus:outline-none"
                  />
                  <Button size="sm" disabled={!!acting} onClick={() => resolve(d.order.id, "RESOLVED_REFUNDED")}
                    className="rounded-full bg-[#1c3a13] hover:bg-[#2a5219] text-[#fcfcf7]">
                    {acting === `${d.order.id}:RESOLVED_REFUNDED` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Refund"}
                  </Button>
                  <Button size="sm" variant="outline" disabled={!!acting} onClick={() => resolve(d.order.id, "RESOLVED_REPLACEMENT")}
                    className="rounded-full border-[#eeeee9] text-[#1c3a13] hover:bg-[#fcfcf7]">
                    {acting === `${d.order.id}:RESOLVED_REPLACEMENT` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Replacement"}
                  </Button>
                  <Button size="sm" variant="outline" disabled={!!acting} onClick={() => resolve(d.order.id, "RESOLVED_DENIED")}
                    className="rounded-full border-red-200 text-red-600 hover:bg-red-50">
                    {acting === `${d.order.id}:RESOLVED_DENIED` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Deny"}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
