"use client";

import { useEffect, useState, useCallback } from "react";
import { Check, X, ChevronLeft, ChevronRight, Loader2, MapPin, Package, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";

const CATEGORY_EMOJI: Record<string, string> = {
  VEGETABLES: "🥦", TUBERS: "🍠", FRUITS: "🍎",
};

const APPROVAL_BADGE: Record<string, string> = {
  PENDING: "bg-[#eeeee9] text-[#1c3a13]",
  APPROVED: "bg-[#d3fa99] text-[#1c3a13]",
  REJECTED: "bg-red-100 text-red-700",
};

interface Listing {
  id: string;
  cropType: string;
  category: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  currency: string;
  images: string[];
  location: string;
  status: string;
  approvalStatus: string;
  approvalNotes: string | null;
  priceFlagged: boolean;
  createdAt: string;
  farmer: { id: string; name: string; phone: string; farmerProfile: { farmName: string } | null };
}

interface Pagination { page: number; total: number; pages: number }

const TABS = [
  { value: "PENDING", label: "Pending Approval" },
  { value: "", label: "All Listings" },
];

export default function AdminListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("PENDING");
  const [page, setPage] = useState(1);
  const [acting, setActing] = useState<Record<string, string>>({});
  const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({});
  const [rejectOpen, setRejectOpen] = useState<Record<string, boolean>>({});
  // Requires a second click on a price-flagged listing — the system already
  // detected an outlier price, so a single accidental/reflexive "Approve"
  // shouldn't be enough to wave it through.
  const [approveConfirmOpen, setApproveConfirmOpen] = useState<Record<string, boolean>>({});
  // Snapshotted per-fetch rather than read fresh during render — a stable
  // reference point is enough for an "overdue" badge and keeps render pure.
  const [fetchedAt, setFetchedAt] = useState(0);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "12" });
    if (tab) params.set("status", tab);
    const res = await fetch(`/api/admin/listings?${params}`);
    const data = await res.json();
    setListings(data.data ?? []);
    setPagination(data.pagination ?? { page: 1, total: 0, pages: 1 });
    setFetchedAt(Date.now());
    setLoading(false);
  }, [tab, page]);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  async function act(listingId: string, approvalStatus: "APPROVED" | "REJECTED", approvalNotes?: string) {
    setActing((prev) => ({ ...prev, [listingId]: approvalStatus }));
    try {
      const res = await fetch(`/api/admin/listings/${listingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalStatus, approvalNotes }),
      });
      if (res.ok) {
        // The "Pending Approval" tab is server-filtered to PENDING listings —
        // once approved/rejected, drop it from view instead of leaving it
        // stuck showing its new status until a manual reload.
        if (tab === "PENDING") {
          setListings((prev) => prev.filter((l) => l.id !== listingId));
          setPagination((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }));
        } else {
          setListings((prev) => prev.map((l) =>
            l.id === listingId ? { ...l, approvalStatus, approvalNotes: approvalNotes ?? l.approvalNotes } : l
          ));
        }
        setRejectOpen((prev) => ({ ...prev, [listingId]: false }));
        setApproveConfirmOpen((prev) => ({ ...prev, [listingId]: false }));
      }
    } finally {
      setActing((prev) => { const n = { ...prev }; delete n[listingId]; return n; });
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-light tracking-tight text-[#1c3a13]">Listing Approvals</h1>
        <p className="text-sm text-[#1c3a13]/50 mt-1">{pagination.total} listings</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#fcfcf7] border border-[#eeeee9] rounded-xl p-1 w-fit">
        {TABS.map((t) => (
          <button key={t.value} onClick={() => { setTab(t.value); setPage(1); }}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.value
                ? "bg-[#1c3a13] text-[#fcfcf7]"
                : "text-[#1c3a13]/70 hover:bg-[#eeeee9] hover:text-[#1c3a13]"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-[#1c3a13]/40" /></div>
      ) : listings.length === 0 ? (
        <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] py-20 text-center">
          <div className="text-5xl mb-3">✅</div>
          <p className="text-[#1c3a13]/50">{tab === "PENDING" ? "No listings pending approval." : "No listings found."}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {listings.map((listing) => {
            const farmName = listing.farmer.farmerProfile?.farmName ?? listing.farmer.name;
            const emoji = CATEGORY_EMOJI[listing.category] ?? "🌿";
            const isPending = listing.approvalStatus === "PENDING";
            // Produce spoils in hours, not days — a pending listing older
            // than 2 hours is a real risk to the farmer's harvest, not just
            // a queue backlog.
            const isOverdue = isPending && fetchedAt - new Date(listing.createdAt).getTime() > 2 * 60 * 60 * 1000;

            return (
              <div key={listing.id} className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] overflow-hidden">
                <div className="flex gap-4 p-5">
                  {/* Thumbnail */}
                  <div className="h-20 w-20 rounded-xl overflow-hidden flex-shrink-0 bg-[#eeeee9] flex items-center justify-center border border-[#eeeee9]">
                    {listing.images[0]
                      ? <img src={listing.images[0]} alt={listing.cropType} className="h-full w-full object-cover" />
                      : <span className="text-3xl">{emoji}</span>}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start gap-2 mb-1">
                      <h3 className="font-medium text-[#1c3a13] text-base">{listing.cropType}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${APPROVAL_BADGE[listing.approvalStatus] ?? "bg-[#eeeee9] text-[#1c3a13]"}`}>
                        {listing.approvalStatus}
                      </span>
                      {listing.priceFlagged && (
                        <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800">
                          ⚠️ Price anomaly
                        </span>
                      )}
                      {isOverdue && (
                        <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700">
                          ⏰ Pending &gt;2h — spoilage risk
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[#1c3a13] font-bold">{formatCurrency(listing.pricePerUnit)} / {listing.unit}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-[#1c3a13]/50 mt-1.5">
                      <span className="flex items-center gap-1"><Package className="h-3.5 w-3.5" />{listing.quantity} {listing.unit}</span>
                      <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{listing.location}</span>
                      <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />Submitted {formatDate(listing.createdAt)}</span>
                    </div>
                    <p className="text-xs text-[#1c3a13]/40 mt-1">{farmName} · {listing.farmer.phone}</p>
                    {listing.approvalNotes && (
                      <p className="text-xs text-[#1c3a13]/50 mt-1.5 italic">Notes: {listing.approvalNotes}</p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {isPending && (
                  <div className="border-t border-[#eeeee9] px-5 py-3 bg-[#eeeee9] flex flex-wrap items-center gap-3">
                    {listing.priceFlagged && !approveConfirmOpen[listing.id] ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full border-amber-600 text-amber-700 hover:bg-amber-50"
                        disabled={!!acting[listing.id]}
                        onClick={() => setApproveConfirmOpen((prev) => ({ ...prev, [listing.id]: true }))}
                      >
                        <Check className="h-3.5 w-3.5 mr-1" />
                        Approve
                      </Button>
                    ) : listing.priceFlagged ? (
                      <div className="flex-1 flex flex-wrap gap-2 items-center rounded-lg border border-amber-300 bg-amber-50 px-3 py-2">
                        <p className="text-xs text-amber-800 flex-1 min-w-[200px]">
                          This listing is priced well outside the normal range for {listing.category} — approve anyway?
                        </p>
                        <div className="flex gap-2">
                          <Button size="sm"
                            className="rounded-full bg-[#1c3a13] hover:bg-[#2a5219] text-[#fcfcf7]"
                            disabled={!!acting[listing.id]}
                            onClick={() => act(listing.id, "APPROVED")}>
                            {acting[listing.id] === "APPROVED" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Yes, Approve Anyway"}
                          </Button>
                          <Button size="sm" variant="ghost"
                            className="rounded-full text-[#1c3a13]/70 hover:text-[#1c3a13] hover:bg-[#fcfcf7]"
                            onClick={() => setApproveConfirmOpen((prev) => ({ ...prev, [listing.id]: false }))}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        className="rounded-full bg-[#1c3a13] hover:bg-[#2a5219] text-[#fcfcf7]"
                        disabled={!!acting[listing.id]}
                        onClick={() => act(listing.id, "APPROVED")}
                      >
                        {acting[listing.id] === "APPROVED" ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                        Approve
                      </Button>
                    )}

                    {!rejectOpen[listing.id] ? (
                      <Button size="sm" variant="outline"
                        className="rounded-full border-red-600 text-red-600 hover:bg-red-50"
                        disabled={!!acting[listing.id]}
                        onClick={() => setRejectOpen((prev) => ({ ...prev, [listing.id]: true }))}>
                        <X className="h-3.5 w-3.5 mr-1" />Reject
                      </Button>
                    ) : (
                      <div className="flex-1 flex flex-wrap gap-2 items-center">
                        <textarea
                          value={rejectNotes[listing.id] ?? ""}
                          onChange={(e) => setRejectNotes((prev) => ({ ...prev, [listing.id]: e.target.value }))}
                          placeholder="Rejection reason (optional)…"
                          rows={2}
                          className="flex-1 min-w-[200px] rounded-lg border border-red-200 bg-[#fcfcf7] px-3 py-1.5 text-sm focus:border-red-400 focus:outline-none resize-none"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline"
                            className="rounded-full border-red-600 text-red-600 hover:bg-red-50"
                            disabled={!!acting[listing.id]}
                            onClick={() => act(listing.id, "REJECTED", rejectNotes[listing.id])}>
                            {acting[listing.id] === "REJECTED" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Confirm Reject"}
                          </Button>
                          <Button size="sm" variant="ghost"
                            className="rounded-full text-[#1c3a13]/70 hover:text-[#1c3a13] hover:bg-[#fcfcf7]"
                            onClick={() => setRejectOpen((prev) => ({ ...prev, [listing.id]: false }))}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#eeeee9] text-[#1c3a13]/70 hover:bg-[#eeeee9] disabled:opacity-40">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-[#1c3a13]/70">Page {page} of {pagination.pages}</span>
          <button onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))} disabled={page >= pagination.pages}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#eeeee9] text-[#1c3a13]/70 hover:bg-[#eeeee9] disabled:opacity-40">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
