"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, Package, Phone, Check, X, PackageCheck, Undo2 } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";

interface Booking {
  id: string;
  cropType: string;
  category: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  scheduledDropoff: string;
  status: string;
  facilityNotes: string | null;
  farmer: { id: string; name: string; phone: string };
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-[#eeeee9] text-[#1c3a13]",
  CONFIRMED: "bg-[#d3fa99] text-[#1c3a13]",
  REJECTED: "bg-red-100 text-red-700",
  DROPPED_OFF: "bg-[#1c3a13] text-[#fcfcf7]",
  RETURNED_TO_FARMER: "bg-amber-100 text-amber-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const TABS = [
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "DROPPED_OFF", label: "In Storage" },
  { value: "", label: "All" },
];

export default function StorageBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("PENDING");
  const [acting, setActing] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/storage/bookings");
    const data = await res.json();
    setBookings(data.bookings ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  async function act(id: string, action: "CONFIRM" | "REJECT" | "DROP_OFF" | "RETURN") {
    setActing(id);
    const res = await fetch(`/api/storage/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) await fetchBookings();
    setActing(null);
  }

  const filtered = tab ? bookings.filter((b) => b.status === tab) : bookings;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-light tracking-tight text-[#1c3a13]">Storage Bookings</h1>
        <p className="text-[#1c3a13]/50 text-sm mt-1">Farmers requesting to drop off produce at your facility</p>
      </div>

      <div className="flex gap-1 bg-[#fcfcf7] border border-[#eeeee9] rounded-xl p-1 w-fit">
        {TABS.map((t) => (
          <button key={t.value} onClick={() => setTab(t.value)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.value ? "bg-[#1c3a13] text-[#fcfcf7]" : "text-[#1c3a13]/70 hover:bg-[#eeeee9]"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-[#1c3a13]/40" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] py-20 text-center">
          <div className="text-5xl mb-3">📦</div>
          <p className="text-[#1c3a13]/50">No bookings in this view.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((b) => (
            <div key={b.id} className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-[#1c3a13]">{b.cropType}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[b.status] ?? "bg-[#eeeee9] text-[#1c3a13]"}`}>
                      {b.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-[#1c3a13]/70">
                    <Package className="h-3.5 w-3.5 text-[#1c3a13]/40" />
                    {b.quantity} {b.unit} · asking {formatCurrency(b.pricePerUnit)}/{b.unit}
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-[#1c3a13]/70">
                    <Calendar className="h-3.5 w-3.5 text-[#1c3a13]/40" />
                    Drop-off: {formatDate(b.scheduledDropoff)}
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-[#1c3a13]/50">
                    <Phone className="h-3.5 w-3.5" />
                    {b.farmer.name} · {b.farmer.phone}
                  </div>
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  {b.status === "PENDING" && (
                    <>
                      <Button size="sm" disabled={acting === b.id} onClick={() => act(b.id, "CONFIRM")}
                        className="rounded-full bg-[#1c3a13] text-[#fcfcf7] hover:bg-[#2a5219]">
                        <Check className="h-3.5 w-3.5 mr-1" />Confirm
                      </Button>
                      <Button size="sm" variant="outline" disabled={acting === b.id} onClick={() => act(b.id, "REJECT")}
                        className="rounded-full border-red-600 text-red-600 hover:bg-red-50">
                        <X className="h-3.5 w-3.5 mr-1" />Reject
                      </Button>
                    </>
                  )}
                  {b.status === "CONFIRMED" && (
                    <Button size="sm" disabled={acting === b.id} onClick={() => act(b.id, "DROP_OFF")}
                      className="rounded-full bg-[#1c3a13] text-[#fcfcf7] hover:bg-[#2a5219]">
                      <PackageCheck className="h-3.5 w-3.5 mr-1" />Mark Dropped Off
                    </Button>
                  )}
                  {b.status === "DROPPED_OFF" && (
                    <Button size="sm" variant="outline" disabled={acting === b.id} onClick={() => act(b.id, "RETURN")}
                      className="rounded-full border-amber-600 text-amber-700 hover:bg-amber-50">
                      <Undo2 className="h-3.5 w-3.5 mr-1" />Return to Farmer
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
