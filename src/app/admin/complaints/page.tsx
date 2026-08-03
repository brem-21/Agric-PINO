"use client";

import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

const CAT_LABELS: Record<string, string> = {
  FRAUD: "Fraud / Scam",
  QUALITY_ISSUE: "Quality Issue",
  DELIVERY_PROBLEM: "Delivery",
  PAYMENT_DISPUTE: "Payment",
  HARASSMENT: "Harassment",
  TECHNICAL: "Technical",
  OTHER: "Other",
};

const STATUS_BADGE: Record<string, string> = {
  OPEN: "bg-red-100 text-red-700",
  UNDER_REVIEW: "bg-[#eeeee9] text-[#1c3a13]",
  RESOLVED: "bg-[#d3fa99] text-[#1c3a13]",
  DISMISSED: "bg-[#eeeee9] text-[#1c3a13]/50",
};

const STATUS_OPTIONS = ["OPEN", "UNDER_REVIEW", "RESOLVED", "DISMISSED"] as const;
type ComplaintStatus = typeof STATUS_OPTIONS[number];

const CAT_BADGE: Record<string, string> = {
  FRAUD: "bg-red-50 text-red-600",
  QUALITY_ISSUE: "bg-[#eeeee9] text-[#1c3a13]",
  DELIVERY_PROBLEM: "bg-[#eeeee9] text-[#1c3a13]",
  PAYMENT_DISPUTE: "bg-[#eeeee9] text-[#1c3a13]",
  HARASSMENT: "bg-red-50 text-red-600",
  TECHNICAL: "bg-[#eeeee9] text-[#1c3a13]",
  OTHER: "bg-[#eeeee9] text-[#1c3a13]/70",
};

const ROLE_BADGE: Record<string, string> = {
  FARMER: "bg-[#eeeee9] text-[#1c3a13]",
  BUYER: "bg-[#eeeee9] text-[#1c3a13]",
  LOGISTICS: "bg-[#eeeee9] text-[#1c3a13]",
  STORAGE_FACILITY: "bg-[#eeeee9] text-[#1c3a13]",
};

interface Complaint {
  id: string;
  subject: string;
  category: string;
  description: string;
  status: ComplaintStatus;
  adminNotes: string | null;
  createdAt: string;
  resolvedAt: string | null;
  reporter: { id: string; name: string; phone: string; role: string };
}

interface Pagination { page: number; total: number; pages: number }

const TABS = [
  { value: "OPEN", label: "Open" },
  { value: "UNDER_REVIEW", label: "Under Review" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "DISMISSED", label: "Dismissed" },
  { value: "", label: "All" },
];

export default function AdminComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("OPEN");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [updating, setUpdating] = useState<Record<string, boolean>>({});
  const [draftStatus, setDraftStatus] = useState<Record<string, ComplaintStatus>>({});
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "15" });
    if (tab) params.set("status", tab);
    const res = await fetch(`/api/admin/complaints?${params}`);
    const data = await res.json();
    setComplaints(data.data ?? []);
    setPagination(data.pagination ?? { page: 1, total: 0, pages: 1 });
    setLoading(false);
  }, [tab, page]);

  useEffect(() => { fetchComplaints(); }, [fetchComplaints]);

  async function updateComplaint(complaint: Complaint) {
    const status = draftStatus[complaint.id] ?? complaint.status;
    const adminNotes = draftNotes[complaint.id] ?? complaint.adminNotes ?? "";
    setUpdating((prev) => ({ ...prev, [complaint.id]: true }));
    try {
      const res = await fetch(`/api/admin/complaints/${complaint.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, adminNotes: adminNotes || undefined }),
      });
      if (res.ok) {
        setComplaints((prev) => prev.map((c) =>
          c.id === complaint.id ? { ...c, status, adminNotes: adminNotes || null } : c
        ));
        setSaved((prev) => ({ ...prev, [complaint.id]: true }));
        setTimeout(() => setSaved((prev) => ({ ...prev, [complaint.id]: false })), 2000);
      }
    } finally {
      setUpdating((prev) => ({ ...prev, [complaint.id]: false }));
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-light tracking-tight text-[#1c3a13]">Complaints</h1>
        <p className="text-sm text-[#1c3a13]/50 mt-1">{pagination.total} complaints</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#fcfcf7] border border-[#eeeee9] rounded-xl p-1 flex-wrap">
        {TABS.map((t) => (
          <button key={t.value} onClick={() => { setTab(t.value); setPage(1); }}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
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
      ) : complaints.length === 0 ? (
        <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] py-20 text-center">
          <div className="text-5xl mb-3">📭</div>
          <p className="text-[#1c3a13]/50">No complaints in this category.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {complaints.map((complaint) => {
            const isExpanded = expanded[complaint.id] ?? false;
            const currentStatus = draftStatus[complaint.id] ?? complaint.status;
            const currentNotes = draftNotes[complaint.id] !== undefined ? draftNotes[complaint.id] : (complaint.adminNotes ?? "");

            return (
              <div key={complaint.id} className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] overflow-hidden">
                {/* Header */}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-medium text-[#1c3a13] truncate">{complaint.subject}</h3>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium flex-shrink-0 ${STATUS_BADGE[complaint.status] ?? "bg-[#eeeee9] text-[#1c3a13]/70"}`}>
                          {complaint.status.replace("_", " ")}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium flex-shrink-0 ${CAT_BADGE[complaint.category] ?? "bg-[#eeeee9] text-[#1c3a13]/70"}`}>
                          {CAT_LABELS[complaint.category] ?? complaint.category}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#1c3a13]/50">
                        <span className={`rounded-full px-1.5 py-0.5 font-medium ${ROLE_BADGE[complaint.reporter.role] ?? "bg-[#eeeee9] text-[#1c3a13]/70"}`}>
                          {complaint.reporter.role}
                        </span>
                        <span>{complaint.reporter.name}</span>
                        <span>·</span>
                        <span>{complaint.reporter.phone}</span>
                        <span>·</span>
                        <span>{formatDate(complaint.createdAt)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setExpanded((prev) => ({ ...prev, [complaint.id]: !prev[complaint.id] }))}
                      className="text-[#1c3a13]/40 hover:text-[#1c3a13] flex-shrink-0"
                    >
                      {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </button>
                  </div>

                  {/* Admin notes preview */}
                  {complaint.adminNotes && !isExpanded && (
                    <p className="text-xs text-[#1c3a13]/40 mt-2 italic">Admin: {complaint.adminNotes}</p>
                  )}
                </div>

                {/* Expanded */}
                {isExpanded && (
                  <div className="border-t border-[#eeeee9] p-5 space-y-4 bg-[#eeeee9]">
                    {/* Description */}
                    <div>
                      <p className="text-xs font-medium text-[#1c3a13]/50 uppercase tracking-wide mb-1.5">Description</p>
                      <p className="text-sm text-[#1c3a13] whitespace-pre-wrap">{complaint.description}</p>
                    </div>

                    {/* Update form */}
                    <div className="space-y-3">
                      <p className="text-xs font-medium text-[#1c3a13]/50 uppercase tracking-wide">Update Status</p>
                      <div className="flex flex-wrap gap-2">
                        {STATUS_OPTIONS.map((s) => (
                          <button
                            key={s}
                            onClick={() => setDraftStatus((prev) => ({ ...prev, [complaint.id]: s }))}
                            className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                              currentStatus === s
                                ? `${STATUS_BADGE[s] ?? ""} border-current`
                                : "border-[#eeeee9] text-[#1c3a13]/70 hover:bg-[#fcfcf7] hover:text-[#1c3a13]"
                            }`}
                          >
                            {s.replace("_", " ")}
                          </button>
                        ))}
                      </div>
                      <textarea
                        value={currentNotes}
                        onChange={(e) => setDraftNotes((prev) => ({ ...prev, [complaint.id]: e.target.value }))}
                        placeholder="Admin notes (visible to reporter when resolved/dismissed)…"
                        rows={3}
                        className="w-full resize-none rounded-lg border border-[#eeeee9] bg-[#fcfcf7] px-4 py-2.5 text-sm text-[#1c3a13] placeholder:text-[#1c3a13]/40 focus:border-[#1c3a13] focus:outline-none"
                      />
                      <div className="flex items-center gap-3">
                        <Button size="sm" className="rounded-full bg-[#1c3a13] hover:bg-[#2a5219] text-[#fcfcf7]"
                          disabled={updating[complaint.id]}
                          onClick={() => updateComplaint(complaint)}>
                          {updating[complaint.id] ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                          Update
                        </Button>
                        {saved[complaint.id] && (
                          <span className="flex items-center gap-1 text-xs text-[#1c3a13]">
                            <CheckCircle className="h-3.5 w-3.5" /> Saved
                          </span>
                        )}
                      </div>
                    </div>
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
