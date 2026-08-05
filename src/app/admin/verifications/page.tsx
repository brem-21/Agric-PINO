"use client";

import { useEffect, useState, useCallback } from "react";
import { Check, X, ChevronLeft, ChevronRight, ChevronDown, Loader2, TrendingUp, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

interface VerificationRow {
  id: string;
  role: string;
  ghanaCardNumber: string;
  ghanaCardName: string;
  residenceLocation: string;
  idPhotoFront: string;
  idPhotoBack: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewNotes: string | null;
  reviewedAt: string | null;
  createdAt: string;
  user: { id: string; name: string; phone: string; image: string | null };
  reviewedBy: { name: string } | null;
}

interface EligibleRow {
  id: string;
  name: string;
  phone: string;
  role: string;
  completedCount: number;
  verificationInvitedAt: string | null;
}

interface TransactionRow {
  id: string;
  label: string;
  detail: string;
  amount: number | null;
  date: string;
}

interface Pagination { page: number; total: number; pages: number }

const TABS = [
  { value: "PENDING", label: "Pending Review" },
  { value: "", label: "All" },
  { value: "ELIGIBLE", label: "Eligible, Not Applied" },
];

export default function AdminVerificationsPage() {
  const [rows, setRows] = useState<VerificationRow[]>([]);
  const [eligibleRows, setEligibleRows] = useState<EligibleRow[]>([]);
  const [threshold, setThreshold] = useState(10);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("PENDING");
  const [page, setPage] = useState(1);
  const [acting, setActing] = useState<Record<string, string>>({});
  const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({});
  const [rejectOpen, setRejectOpen] = useState<Record<string, boolean>>({});
  const [lightbox, setLightbox] = useState<string | null>(null);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [transactionsById, setTransactionsById] = useState<Record<string, TransactionRow[]>>({});
  const [txLoading, setTxLoading] = useState<Record<string, boolean>>({});
  const [inviting, setInviting] = useState<Record<string, boolean>>({});

  const fetchRows = useCallback(async () => {
    setLoading(true);
    if (tab === "ELIGIBLE") {
      const res = await fetch("/api/admin/verifications?view=eligible");
      const data = await res.json();
      setEligibleRows(data.data ?? []);
      setThreshold(data.threshold ?? 10);
      setLoading(false);
      return;
    }
    const params = new URLSearchParams({ page: String(page), limit: "12" });
    if (tab) params.set("status", tab);
    const res = await fetch(`/api/admin/verifications?${params}`);
    const data = await res.json();
    setRows(data.data ?? []);
    setPagination(data.pagination ?? { page: 1, total: 0, pages: 1 });
    setLoading(false);
  }, [tab, page]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  async function act(id: string, status: "APPROVED" | "REJECTED", reviewNotes?: string) {
    setActing((prev) => ({ ...prev, [id]: status }));
    try {
      const res = await fetch(`/api/admin/verifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reviewNotes }),
      });
      if (res.ok) {
        setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status, reviewNotes: reviewNotes ?? r.reviewNotes } : r)));
        setRejectOpen((prev) => ({ ...prev, [id]: false }));
      } else {
        const data = await res.json();
        alert(data.error ?? "Failed to save review");
      }
    } finally {
      setActing((prev) => { const n = { ...prev }; delete n[id]; return n; });
    }
  }

  async function toggleExpand(userId: string) {
    const willExpand = !expanded[userId];
    setExpanded((prev) => ({ ...prev, [userId]: willExpand }));
    if (willExpand && !transactionsById[userId]) {
      setTxLoading((prev) => ({ ...prev, [userId]: true }));
      try {
        const res = await fetch(`/api/admin/verifications/eligible-transactions?userId=${userId}`);
        const data = await res.json();
        setTransactionsById((prev) => ({ ...prev, [userId]: data.data ?? [] }));
      } finally {
        setTxLoading((prev) => ({ ...prev, [userId]: false }));
      }
    }
  }

  async function sendInvite(userId: string) {
    setInviting((prev) => ({ ...prev, [userId]: true }));
    try {
      const res = await fetch("/api/admin/verifications/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Failed to send invite");
        return;
      }
      setEligibleRows((prev) => prev.map((u) => (u.id === userId ? { ...u, verificationInvitedAt: data.invitedAt } : u)));
    } finally {
      setInviting((prev) => { const n = { ...prev }; delete n[userId]; return n; });
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-light tracking-tight text-[#1c3a13]">Verification Requests</h1>
        <p className="text-sm text-[#1c3a13]/50 mt-1">
          Free — activity-gated, no fee involved. {tab === "ELIGIBLE" ? `${eligibleRows.length} eligible` : `${pagination.total} requests`}
        </p>
      </div>

      <div className="flex gap-1 bg-[#fcfcf7] border border-[#eeeee9] rounded-xl p-1 w-fit">
        {TABS.map((t) => (
          <button key={t.value} onClick={() => { setTab(t.value); setPage(1); }}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.value ? "bg-[#1c3a13] text-[#fcfcf7]" : "text-[#1c3a13]/70 hover:bg-[#eeeee9] hover:text-[#1c3a13]"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-[#1c3a13]/40" /></div>
      ) : tab === "ELIGIBLE" ? (
        eligibleRows.length === 0 ? (
          <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] py-20 text-center">
            <div className="text-5xl mb-3">🔔</div>
            <p className="text-[#1c3a13]/50">No one has crossed the {threshold}-transaction threshold without already applying.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-[#1c3a13]/50">
              These users are eligible to apply for verification but haven&apos;t yet — worth a proactive nudge.
            </p>
            {eligibleRows.map((u) => (
              <div key={u.id} className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] overflow-hidden">
                <div className="p-4 flex items-center justify-between gap-3 flex-wrap">
                  <button onClick={() => toggleExpand(u.id)} className="flex items-center gap-3 text-left flex-1 min-w-[200px]">
                    <ChevronDown className={`h-4 w-4 text-[#1c3a13]/40 flex-shrink-0 transition-transform ${expanded[u.id] ? "rotate-180" : ""}`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-[#1c3a13]">{u.name}</p>
                        <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-[#eeeee9] text-[#1c3a13]">{u.role}</span>
                      </div>
                      <p className="text-sm text-[#1c3a13]/50">{u.phone}</p>
                    </div>
                  </button>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-sm font-medium text-[#1c3a13]">
                      <TrendingUp className="h-4 w-4" />
                      {u.completedCount} completed
                    </div>
                    <Button size="sm" variant={u.verificationInvitedAt ? "outline" : "default"}
                      disabled={!!inviting[u.id]}
                      onClick={() => sendInvite(u.id)}
                      className={u.verificationInvitedAt
                        ? "rounded-full border-[#eeeee9] text-[#1c3a13]"
                        : "rounded-full bg-[#1c3a13] hover:bg-[#2a5219] text-[#fcfcf7]"}>
                      {inviting[u.id] ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Send className="h-3.5 w-3.5 mr-1" />}
                      {u.verificationInvitedAt ? "Resend Invite" : "Send Verification Request"}
                    </Button>
                  </div>
                </div>
                {u.verificationInvitedAt && (
                  <p className="px-4 pb-2 -mt-2 text-xs text-[#1c3a13]/40">Invited {formatDate(u.verificationInvitedAt)}</p>
                )}

                {expanded[u.id] && (
                  <div className="border-t border-[#eeeee9] bg-[#eeeee9] px-4 py-3">
                    {txLoading[u.id] ? (
                      <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-[#1c3a13]/40" /></div>
                    ) : (transactionsById[u.id]?.length ?? 0) === 0 ? (
                      <p className="text-xs text-[#1c3a13]/50 py-2">No completed transactions found.</p>
                    ) : (
                      <div className="space-y-2">
                        {transactionsById[u.id].map((t) => (
                          <div key={t.id} className="flex items-center justify-between gap-3 text-xs bg-[#fcfcf7] rounded-lg px-3 py-2">
                            <div className="min-w-0">
                              <p className="font-medium text-[#1c3a13] truncate">{t.label}</p>
                              <p className="text-[#1c3a13]/50 truncate">{t.detail} · {formatDate(t.date)}</p>
                            </div>
                            {t.amount != null && <span className="font-medium text-[#1c3a13] flex-shrink-0">GHS {t.amount.toFixed(2)}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      ) : rows.length === 0 ? (
        <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] py-20 text-center">
          <div className="text-5xl mb-3">🪪</div>
          <p className="text-[#1c3a13]/50">{tab === "PENDING" ? "No requests pending review." : "No requests found."}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((r) => {
            const isPending = r.status === "PENDING";
            return (
              <div key={r.id} className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] overflow-hidden">
                <div className="flex flex-col sm:flex-row gap-4 p-5">
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => setLightbox(r.idPhotoFront)} className="h-20 w-28 rounded-xl overflow-hidden bg-[#eeeee9] border border-[#eeeee9] flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={r.idPhotoFront} alt="Ghana Card front" className="h-full w-full object-cover" />
                    </button>
                    {r.idPhotoBack && (
                      <button onClick={() => setLightbox(r.idPhotoBack)} className="h-20 w-28 rounded-xl overflow-hidden bg-[#eeeee9] border border-[#eeeee9] flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={r.idPhotoBack} alt="Ghana Card back" className="h-full w-full object-cover" />
                      </button>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-medium text-[#1c3a13]">{r.user.name}</h3>
                      <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-[#eeeee9] text-[#1c3a13]">{r.role}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        r.status === "APPROVED" ? "bg-[#d3fa99] text-[#1c3a13]" : r.status === "REJECTED" ? "bg-red-100 text-red-700" : "bg-[#eeeee9] text-[#1c3a13]"
                      }`}>{r.status}</span>
                    </div>
                    <p className="text-sm text-[#1c3a13]/70">{r.user.phone}</p>
                    <div className="text-xs text-[#1c3a13]/50 mt-1.5 space-y-0.5">
                      <p>Ghana Card: <span className="font-mono text-[#1c3a13]">{r.ghanaCardNumber}</span> · {r.ghanaCardName}</p>
                      <p>Residence: {r.residenceLocation}</p>
                      <p>Submitted {formatDate(r.createdAt)}</p>
                      {r.reviewedBy && r.reviewedAt && <p>Reviewed by {r.reviewedBy.name} on {formatDate(r.reviewedAt)}</p>}
                    </div>
                    {r.reviewNotes && <p className="text-xs text-[#1c3a13]/50 mt-1.5 italic">Notes: {r.reviewNotes}</p>}
                  </div>
                </div>

                {isPending && (
                  <div className="border-t border-[#eeeee9] px-5 py-3 bg-[#eeeee9] flex flex-wrap items-center gap-3">
                    <Button size="sm" className="rounded-full bg-[#1c3a13] hover:bg-[#2a5219] text-[#fcfcf7]"
                      disabled={!!acting[r.id]} onClick={() => act(r.id, "APPROVED")}>
                      {acting[r.id] === "APPROVED" ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                      Approve
                    </Button>

                    {!rejectOpen[r.id] ? (
                      <Button size="sm" variant="outline" className="rounded-full border-red-600 text-red-600 hover:bg-red-50"
                        disabled={!!acting[r.id]} onClick={() => setRejectOpen((prev) => ({ ...prev, [r.id]: true }))}>
                        <X className="h-3.5 w-3.5 mr-1" />Reject
                      </Button>
                    ) : (
                      <div className="flex-1 flex flex-wrap gap-2 items-center">
                        <textarea
                          value={rejectNotes[r.id] ?? ""}
                          onChange={(e) => setRejectNotes((prev) => ({ ...prev, [r.id]: e.target.value }))}
                          placeholder="Rejection reason (shown to the user)…"
                          rows={2}
                          className="flex-1 min-w-[200px] rounded-lg border border-red-200 bg-[#fcfcf7] px-3 py-1.5 text-sm focus:border-red-400 focus:outline-none resize-none"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="rounded-full border-red-600 text-red-600 hover:bg-red-50"
                            disabled={!!acting[r.id]} onClick={() => act(r.id, "REJECTED", rejectNotes[r.id])}>
                            {acting[r.id] === "REJECTED" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Confirm Reject"}
                          </Button>
                          <Button size="sm" variant="ghost" className="rounded-full text-[#1c3a13]/70 hover:text-[#1c3a13] hover:bg-[#fcfcf7]"
                            onClick={() => setRejectOpen((prev) => ({ ...prev, [r.id]: false }))}>
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

      {tab !== "ELIGIBLE" && pagination.pages > 1 && (
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

      {lightbox && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="Ghana Card" className="max-h-[90vh] max-w-full rounded-xl" />
        </div>
      )}
    </div>
  );
}
