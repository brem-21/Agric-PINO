"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, Package, MapPin, XCircle } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";

interface Booking {
  id: string;
  cropType: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  scheduledDropoff: string;
  status: string;
  facilityNotes: string | null;
  facility: { id: string; name: string; location: string };
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-[#eeeee9] text-[#1c3a13]",
  CONFIRMED: "bg-[#d3fa99] text-[#1c3a13]",
  REJECTED: "bg-red-100 text-red-700",
  DROPPED_OFF: "bg-[#1c3a13] text-[#fcfcf7]",
  RETURNED_TO_FARMER: "bg-amber-100 text-amber-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export default function FarmerStorageBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/storage/bookings");
    const data = await res.json();
    setBookings(data.bookings ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  async function cancel(id: string) {
    setCancelling(id);
    const res = await fetch(`/api/storage/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "CANCEL" }),
    });
    if (res.ok) await fetchBookings();
    setCancelling(null);
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light tracking-tight text-[#1c3a13]">My Storage Bookings</h1>
          <p className="text-[#1c3a13]/50 text-sm mt-1">{bookings.length} booking{bookings.length !== 1 ? "s" : ""}</p>
        </div>
        <Button asChild variant="outline" className="rounded-full border-[#eeeee9] text-[#1c3a13] hover:bg-[#eeeee9]">
          <Link href="/farmer/storage">Find a Facility</Link>
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-[#1c3a13]/40" /></div>
      ) : bookings.length === 0 ? (
        <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] py-20 text-center">
          <div className="text-5xl mb-3">📦</div>
          <p className="text-[#1c3a13]/50">No storage bookings yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <div key={b.id} className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-[#1c3a13]">{b.cropType}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[b.status] ?? "bg-[#eeeee9] text-[#1c3a13]"}`}>
                      {b.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="flex items-center gap-1.5 text-sm text-[#1c3a13]/70">
                    <MapPin className="h-3.5 w-3.5 text-[#1c3a13]/40" />
                    {b.facility.name} — {b.facility.location}
                  </p>
                  <p className="flex items-center gap-1.5 text-sm text-[#1c3a13]/70">
                    <Package className="h-3.5 w-3.5 text-[#1c3a13]/40" />
                    {b.quantity} {b.unit} · asking {formatCurrency(b.pricePerUnit)}/{b.unit}
                  </p>
                  <p className="flex items-center gap-1.5 text-sm text-[#1c3a13]/50">
                    <Calendar className="h-3.5 w-3.5" />
                    Drop-off: {formatDate(b.scheduledDropoff)}
                  </p>
                  {b.facilityNotes && (
                    <p className="text-xs text-[#1c3a13]/50 italic">Facility note: {b.facilityNotes}</p>
                  )}
                </div>
                {["PENDING", "CONFIRMED"].includes(b.status) && (
                  <button
                    onClick={() => cancel(b.id)}
                    disabled={cancelling === b.id}
                    className="shrink-0 inline-flex items-center gap-1 rounded-full border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {cancelling === b.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
