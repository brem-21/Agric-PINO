"use client";

import { useEffect, useState, useCallback } from "react";
import { Check, X, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

interface RequestRow {
  id: string;
  reason: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewNotes: string | null;
  reviewedAt: string | null;
  createdAt: string;
  user: { id: string; name: string; phone: string; role: string; image: string | null };
  reviewedBy: { name: string } | null;
}

interface Pagination { page: number; total: number; pages: number }

const TABS = [
  { value: "PENDING", label: "Pending Review" },
  { value: "", label: "All" },
];

export default function AdminIncidentTeamRequestsPage() {
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("PENDING");
  const [page, setPage] = useState(1);
  const [acting, setActing] = useState<Record<string, string>>({});
  const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({});
  const [rejectOpen, setRejectOpen] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<Record<string, string>>({});

  const fetchRows = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "12" });
    if (tab) params.set("status", tab);
    const res = await fetch(`/api/admin/incident-team-requests?${params}`);
    const data = await res.json();
    setRows(data.data ?? []);
    setPagination(data.pagination ?? { page: 1, total: 0, pages: 1 });
    setLoading(false);
  }, [tab, page]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  async function act(id: string, status: "APPROVED" | "REJECTED", reviewNotes?: string) {
    setActing((prev) => ({ ...prev, [id]: status }));
    setError((prev) => ({ ...prev, [id]: "" }));
    try {
      const res = await fetch(`/api/admin/incident-team-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reviewNotes }),
      });
      if (res.ok) {
        setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status, reviewNotes: reviewNotes ?? r.reviewNotes } : r)));
        setRejectOpen((prev) => ({ ...prev, [id]: false }));
      } else {
        const data = await res.json();
        setError((prev) => ({ ...prev, [id]: data.error ?? "Failed to save review" }));
      }
    } finally {
      setActing((prev) => { const n = { ...prev }; delete n[id]; return n; });
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-light tracking-tight text-[#1c3a13]">Macho Men Association Applications</h1>
        <p className="text-sm text-[#1c3a13]/50 mt-1">{pagination.total} applications — approval only adds incident-team access, the applicant's role is unchanged</p>
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
      ) : rows.length === 0 ? (
        <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] py-20 text-center">
          <div className="text-5xl mb-3">💪</div>
          <p className="text-[#1c3a13]/50">{tab === "PENDING" ? "No applications pending review." : "No applications found."}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((r) => {
            const isPending = r.status === "PENDING";
            return (
              <div key={r.id} className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] overflow-hidden">
                <div className="p-5">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-medium text-[#1c3a13]">{r.user.name}</h3>
                    <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-[#eeeee9] text-[#1c3a13]">{r.user.role}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      r.status === "APPROVED" ? "bg-[#d3fa99] text-[#1c3a13]" : r.status === "REJECTED" ? "bg-red-100 text-red-700" : "bg-[#eeeee9] text-[#1c3a13]"
                    }`}>{r.status}</span>
                  </div>
                  <p className="text-sm text-[#1c3a13]/70">{r.user.phone}</p>
                  {r.reason && <p className="text-sm text-[#1c3a13]/70 mt-1.5 italic">&ldquo;{r.reason}&rdquo;</p>}
                  <p className="text-xs text-[#1c3a13]/50 mt-1.5">Applied {formatDate(r.createdAt)}</p>
                  {r.reviewedBy && r.reviewedAt && <p className="text-xs text-[#1c3a13]/50">Reviewed by {r.reviewedBy.name} on {formatDate(r.reviewedAt)}</p>}
                  {r.reviewNotes && <p className="text-xs text-[#1c3a13]/50 mt-1.5 italic">Notes: {r.reviewNotes}</p>}
                  {error[r.id] && <p className="text-xs text-red-600 mt-1.5">{error[r.id]}</p>}
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
                          placeholder="Rejection reason (shown to the applicant)…"
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
