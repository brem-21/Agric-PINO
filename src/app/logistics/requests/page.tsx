"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Calendar, Package, Truck, Loader2, RefreshCw, CheckCircle, XCircle, RotateCcw, DollarSign, Weight, User, Map as MapIcon } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { DeliveryMap } from "@/components/shared/delivery-map";

type AcceptDialogState = { open: false } | { open: true; reqId: string; date: string };

type TransportReqItem = {
  id: string;
  status: string;
  pickupLocation: string;
  pickupLat: number | null;
  pickupLong: number | null;
  deliveryLocation: string;
  deliveryLat: number | null;
  deliveryLong: number | null;
  scheduledDate: string;
  estimatedCost: number | null;
  weightKg: number | null;
  notes: string | null;
  requester: { name: string; phone: string };
  order?: {
    listing: { cropType: string; quantity: number; unit: string };
    buyer: { name: string; phone: string };
  } | null;
  provider?: { user: { name: string; phone: string } } | null;
};

const STATUS_STYLES: Record<string, string> = {
  PENDING:    "bg-[#eeeee9] text-[#1c3a13]",
  ASSIGNED:   "bg-[#eeeee9] text-[#1c3a13]",
  PICKED_UP:  "bg-[#eeeee9] text-[#1c3a13]",
  IN_TRANSIT: "bg-[#eeeee9] text-[#1c3a13]",
  DELIVERED:  "bg-[#d3fa99] text-[#1c3a13]",
  CANCELLED:  "bg-red-100 text-red-700",
};

export default function LogisticsRequestsPage() {
  const [requests, setRequests] = useState<TransportReqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [acceptDialog, setAcceptDialog] = useState<AcceptDialogState>({ open: false });

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/transport");
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  useEffect(() => {
    const id = setInterval(() => fetchRequests(), 20_000);
    return () => clearInterval(id);
  }, [fetchRequests]);

  async function doAction(requestId: string, action: string, estimatedDeliveryDate?: string) {
    setActing(`${requestId}:${action}`);
    try {
      const res = await fetch("/api/transport", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          action,
          ...(estimatedDeliveryDate ? { estimatedDeliveryDate } : {}),
        }),
      });
      if (res.ok) fetchRequests();
    } finally {
      setActing(null);
    }
  }

  function openAcceptDialog(reqId: string) {
    // Default estimated delivery date = tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().slice(0, 10);
    setAcceptDialog({ open: true, reqId, date: dateStr });
  }

  async function confirmAccept() {
    if (!acceptDialog.open) return;
    const { reqId, date } = acceptDialog;
    setAcceptDialog({ open: false });
    await doAction(reqId, "accept", date ? new Date(date).toISOString() : undefined);
  }

  const pending = requests.filter((r) => r.status === "PENDING");
  const mine = requests.filter((r) => r.status !== "PENDING");

  function ActionBtn({
    reqId,
    action,
    label,
    icon,
    className,
  }: {
    reqId: string;
    action: string;
    label: string;
    icon: React.ReactNode;
    className: string;
  }) {
    const key = `${reqId}:${action}`;
    const busy = acting === key;
    return (
      <button
        onClick={() => doAction(reqId, action)}
        disabled={!!acting}
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${className}`}
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : icon}
        {label}
      </button>
    );
  }

  function RequestCard({ req, isPending }: { req: TransportReqItem; isPending: boolean }) {
    const [showMap, setShowMap] = useState(false);
    const hasCoords = req.pickupLat && req.pickupLong && req.deliveryLat && req.deliveryLong;
    return (
      <div className={`bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl border-l-4 ${isPending ? "border-l-[#d3fa99]" : "border-l-[#1c3a13]"}`}>
        <div className="pb-2 pt-4 px-4 flex items-center justify-between gap-2">
          <p className="text-base font-medium text-[#1c3a13]">
            {req.order?.listing.cropType ?? "General Transport"}
          </p>
          <span className={`shrink-0 text-xs px-2.5 py-0.5 rounded-full font-medium ${STATUS_STYLES[req.status] ?? "bg-[#eeeee9] text-[#1c3a13]"}`}>
            {req.status.replace("_", " ")}
          </span>
        </div>
        <div className="px-4 pb-4 space-y-2.5">
          {/* Locations */}
          <div className="text-sm text-[#1c3a13]/70 space-y-1">
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-[#1c3a13]/40 flex-shrink-0" />
              <span className="truncate">{req.pickupLocation}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-[#1c3a13] flex-shrink-0" />
              <span className="truncate">{req.deliveryLocation}</span>
            </div>
            {hasCoords && (
              <button
                onClick={() => setShowMap((v) => !v)}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#1c3a13] hover:underline"
              >
                <MapIcon className="h-3 w-3" />
                {showMap ? "Hide map" : "Show map"}
              </button>
            )}
          </div>

          {showMap && hasCoords && (
            <DeliveryMap
              pickup={{ lat: req.pickupLat!, lng: req.pickupLong!, label: req.pickupLocation }}
              delivery={{ lat: req.deliveryLat!, lng: req.deliveryLong!, label: req.deliveryLocation }}
              height={200}
            />
          )}

          {/* Meta */}
          <div className="flex flex-wrap gap-3 text-xs text-[#1c3a13]/50">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(req.scheduledDate)}
            </span>
            {req.order && (
              <span className="flex items-center gap-1">
                <Package className="h-3 w-3" />
                {req.order.listing.quantity} {req.order.listing.unit}
              </span>
            )}
            {req.weightKg && (
              <span className="flex items-center gap-1">
                <Weight className="h-3 w-3" />
                {req.weightKg} kg
              </span>
            )}
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              Farmer: {req.requester.name}
            </span>
            {req.order?.buyer && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                Buyer: {req.order.buyer.name} · {req.order.buyer.phone}
              </span>
            )}
          </div>

          {/* Farmer's offered price */}
          {req.estimatedCost && (
            <div className="flex items-center gap-1.5 rounded-2xl bg-[#eeeee9] border border-[#eeeee9] px-3 py-2">
              <DollarSign className="h-4 w-4 text-[#1c3a13] flex-shrink-0" />
              <span className="text-sm font-bold text-[#1c3a13]">
                Farmer offer: {formatCurrency(req.estimatedCost)}
              </span>
            </div>
          )}

          {req.notes && (
            <p className="text-xs text-[#1c3a13]/50 italic border-t border-[#eeeee9] pt-2">{req.notes}</p>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 pt-1">
            {isPending && (
              <>
                <button
                  onClick={() => openAcceptDialog(req.id)}
                  disabled={!!acting}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 bg-[#1c3a13] text-[#fcfcf7] hover:bg-[#2a5219]"
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  Accept
                </button>
                <ActionBtn
                  reqId={req.id}
                  action="reject"
                  label="Reject"
                  icon={<XCircle className="h-3.5 w-3.5" />}
                  className="border border-red-300 text-red-600 hover:bg-red-50"
                />
              </>
            )}
            {req.status === "ASSIGNED" && (
              <>
                <ActionBtn
                  reqId={req.id}
                  action="pickup"
                  label="Mark Picked Up"
                  icon={<Package className="h-3.5 w-3.5" />}
                  className="bg-[#1c3a13] text-[#fcfcf7] hover:bg-[#2a5219]"
                />
                <ActionBtn
                  reqId={req.id}
                  action="give_back"
                  label="Give Back"
                  icon={<RotateCcw className="h-3.5 w-3.5" />}
                  className="border border-[#eeeee9] text-[#1c3a13] hover:bg-[#eeeee9]"
                />
              </>
            )}
            {req.status === "PICKED_UP" && (
              <ActionBtn
                reqId={req.id}
                action="transit"
                label="In Transit"
                icon={<Truck className="h-3.5 w-3.5" />}
                className="bg-[#1c3a13] text-[#fcfcf7] hover:bg-[#2a5219]"
              />
            )}
            {req.status === "IN_TRANSIT" && (
              <ActionBtn
                reqId={req.id}
                action="deliver"
                label="Mark Delivered"
                icon={<CheckCircle className="h-3.5 w-3.5" />}
                className="bg-[#1c3a13] text-[#fcfcf7] hover:bg-[#2a5219]"
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Accept confirm dialog */}
      {acceptDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#fcfcf7] border border-[#eeeee9] p-6 space-y-4">
            <h3 className="text-base font-medium text-[#1c3a13]">
              Accept Transport Request
            </h3>
            <p className="text-sm text-[#1c3a13]/50">
              Set the estimated delivery date for this job.
            </p>
            <div>
              <label className="block text-xs font-medium text-[#1c3a13] mb-1.5">
                Estimated Delivery Date
              </label>
              <input
                type="date"
                value={acceptDialog.date}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) =>
                  setAcceptDialog((prev) =>
                    prev.open ? { ...prev, date: e.target.value } : prev
                  )
                }
                className="w-full rounded-lg border border-[#eeeee9] bg-[#fcfcf7] px-3 py-2 text-sm text-[#1c3a13] focus:outline-none focus:ring-2 focus:ring-[#1c3a13]"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={confirmAccept}
                className="flex-1 rounded-full bg-[#1c3a13] py-2 text-sm font-semibold text-[#fcfcf7] hover:bg-[#2a5219] transition-colors"
              >
                Confirm Accept
              </button>
              <button
                onClick={() => setAcceptDialog({ open: false })}
                className="flex-1 rounded-full border border-[#eeeee9] py-2 text-sm font-medium text-[#1c3a13] hover:bg-[#eeeee9] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light tracking-tight text-[#1c3a13]">Transport Requests</h1>
          <p className="text-[#1c3a13]/50 text-sm mt-1">Accept and manage transport jobs</p>
        </div>
        <button
          onClick={fetchRequests}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#eeeee9] px-3 py-2 text-sm text-[#1c3a13]/70 hover:bg-[#eeeee9] disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-[#1c3a13]/40" />
        </div>
      ) : (
        <>
          {/* Available requests */}
          <section>
            <h2 className="text-lg font-medium text-[#1c3a13] mb-3">
              Available Jobs
              <span className="ml-2 text-sm font-normal text-[#1c3a13]/50">({pending.length})</span>
            </h2>
            {pending.length === 0 ? (
              <div className="bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl">
                <div className="py-12 text-center text-[#1c3a13]/50">
                  <Truck className="h-10 w-10 mx-auto mb-3 text-[#1c3a13]/40" />
                  No pending transport requests right now.
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {pending.map((req) => (
                  <RequestCard key={req.id} req={req} isPending />
                ))}
              </div>
            )}
          </section>

          {/* My jobs */}
          <section>
            <h2 className="text-lg font-medium text-[#1c3a13] mb-3">
              My Jobs
              <span className="ml-2 text-sm font-normal text-[#1c3a13]/50">
                ({mine.filter((r) => !["DELIVERED", "CANCELLED"].includes(r.status)).length} active)
              </span>
            </h2>
            {mine.length === 0 ? (
              <div className="bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl">
                <div className="py-8 text-center text-[#1c3a13]/50 text-sm">
                  No active jobs yet. Accept a request above to get started.
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {mine.map((req) => (
                  <RequestCard key={req.id} req={req} isPending={false} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
