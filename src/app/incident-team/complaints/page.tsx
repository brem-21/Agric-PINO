"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Loader2, CheckCircle, UserPlus, UserMinus } from "lucide-react";
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
  UNDER_REVIEW: "bg-[#fee2e2] text-[#7f1d1d]",
  RESOLVED: "bg-[#fecaca] text-[#7f1d1d]",
  DISMISSED: "bg-[#fee2e2] text-[#7f1d1d]/50",
};

const STATUS_OPTIONS = ["OPEN", "UNDER_REVIEW", "RESOLVED", "DISMISSED"] as const;
type ComplaintStatus = typeof STATUS_OPTIONS[number];

const CAT_BADGE: Record<string, string> = {
  FRAUD: "bg-red-50 text-red-600",
  QUALITY_ISSUE: "bg-[#fee2e2] text-[#7f1d1d]",
  DELIVERY_PROBLEM: "bg-[#fee2e2] text-[#7f1d1d]",
  PAYMENT_DISPUTE: "bg-[#fee2e2] text-[#7f1d1d]",
  HARASSMENT: "bg-red-50 text-red-600",
  TECHNICAL: "bg-[#fee2e2] text-[#7f1d1d]",
  OTHER: "bg-[#fee2e2] text-[#7f1d1d]/70",
};

const ROLE_BADGE: Record<string, string> = {
  FARMER: "bg-[#fee2e2] text-[#7f1d1d]",
  BUYER: "bg-[#fee2e2] text-[#7f1d1d]",
  LOGISTICS: "bg-[#fee2e2] text-[#7f1d1d]",
  STORAGE_FACILITY: "bg-[#fee2e2] text-[#7f1d1d]",
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
  target: { id: string; name: string; phone: string; role: string } | null;
  assignedTo: { id: string; name: string } | null;
}

interface Pagination { page: number; total: number; pages: number }

const POOLS = [
  { value: "unassigned", label: "Unassigned Pool" },
  { value: "mine", label: "Assigned to Me" },
];

export default function IncidentTeamComplaintsPage() {
  const { data: session } = useSession();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [pool, setPool] = useState("unassigned");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [updating, setUpdating] = useState<Record<string, boolean>>({});
  const [draftStatus, setDraftStatus] = useState<Record<string, ComplaintStatus>>({});
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "15", assignment: pool });
    const res = await fetch(`/api/admin/complaints?${params}`);
    const data = await res.json();
    setComplaints(data.data ?? []);
    setPagination(data.pagination ?? { page: 1, total: 0, pages: 1 });
    setLoading(false);
  }, [pool, page]);

  useEffect(() => { fetchComplaints(); }, [fetchComplaints]);

  async function patchComplaint(id: string, body: Record<string, unknown>) {
    setUpdating((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/admin/complaints/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return res.ok;
    } finally {
      setUpdating((prev) => ({ ...prev, [id]: false }));
    }
  }

  async function assignToMe(complaint: Complaint) {
    const ok = await patchComplaint(complaint.id, { assignedToId: session?.user?.id });
    if (ok) fetchComplaints();
  }

  async function unassign(complaint: Complaint) {
    const ok = await patchComplaint(complaint.id, { assignedToId: null });
    if (ok) fetchComplaints();
  }

  async function updateComplaint(complaint: Complaint) {
    const status = draftStatus[complaint.id] ?? complaint.status;
    const adminNotes = draftNotes[complaint.id] ?? complaint.adminNotes ?? "";
    const ok = await patchComplaint(complaint.id, { status, adminNotes: adminNotes || undefined });
    if (ok) {
      setComplaints((prev) => prev.map((c) =>
        c.id === complaint.id ? { ...c, status, adminNotes: adminNotes || null } : c
      ));
      setSaved((prev) => ({ ...prev, [complaint.id]: true }));
      setTimeout(() => setSaved((prev) => ({ ...prev, [complaint.id]: false })), 2000);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-light tracking-tight text-[#7f1d1d]">Complaints</h1>
        <p className="text-sm text-[#7f1d1d]/50 mt-1">{pagination.total} complaints</p>
      </div>

      <div className="flex gap-1 bg-[#fef2f2] border border-[#fee2e2] rounded-xl p-1 flex-wrap">
        {POOLS.map((t) => (
          <button key={t.value} onClick={() => { setPool(t.value); setPage(1); }}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              pool === t.value
                ? "bg-[#7f1d1d] text-[#fef2f2]"
                : "text-[#7f1d1d]/70 hover:bg-[#fee2e2] hover:text-[#7f1d1d]"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-[#7f1d1d]/40" /></div>
      ) : complaints.length === 0 ? (
        <div className="bg-[#fef2f2] rounded-2xl border border-[#fee2e2] py-20 text-center">
          <div className="text-5xl mb-3">💪</div>
          <p className="text-[#7f1d1d]/50">Nothing here right now.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {complaints.map((complaint) => {
            const isExpanded = expanded[complaint.id] ?? false;
            const currentStatus = draftStatus[complaint.id] ?? complaint.status;
            const currentNotes = draftNotes[complaint.id] !== undefined ? draftNotes[complaint.id] : (complaint.adminNotes ?? "");
            const isMine = complaint.assignedTo?.id === session?.user?.id;

            return (
              <div key={complaint.id} className="bg-[#fef2f2] rounded-2xl border border-[#fee2e2] overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-medium text-[#7f1d1d] truncate">{complaint.subject}</h3>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium flex-shrink-0 ${STATUS_BADGE[complaint.status] ?? "bg-[#fee2e2] text-[#7f1d1d]/70"}`}>
                          {complaint.status.replace("_", " ")}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium flex-shrink-0 ${CAT_BADGE[complaint.category] ?? "bg-[#fee2e2] text-[#7f1d1d]/70"}`}>
                          {CAT_LABELS[complaint.category] ?? complaint.category}
                        </span>
                        {complaint.assignedTo && (
                          <span className="rounded-full px-2 py-0.5 text-xs font-medium flex-shrink-0 bg-[#fee2e2] text-[#7f1d1d]/70">
                            {isMine ? "Assigned to you" : `Assigned: ${complaint.assignedTo.name}`}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#7f1d1d]/50">
                        <span className={`rounded-full px-1.5 py-0.5 font-medium ${ROLE_BADGE[complaint.reporter.role] ?? "bg-[#fee2e2] text-[#7f1d1d]/70"}`}>
                          {complaint.reporter.role}
                        </span>
                        <span>Reported by {complaint.reporter.name}</span>
                        <span>·</span>
                        <span>{complaint.reporter.phone}</span>
                        <span>·</span>
                        <span>{formatDate(complaint.createdAt)}</span>
                      </div>
                      {complaint.target && (
                        <div className="flex flex-wrap items-center gap-2 text-xs text-[#7f1d1d]/50 mt-1">
                          <span>About:</span>
                          <span className={`rounded-full px-1.5 py-0.5 font-medium ${ROLE_BADGE[complaint.target.role] ?? "bg-[#fee2e2] text-[#7f1d1d]/70"}`}>
                            {complaint.target.role}
                          </span>
                          <span className="font-medium text-[#7f1d1d]">{complaint.target.name}</span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setExpanded((prev) => ({ ...prev, [complaint.id]: !prev[complaint.id] }))}
                      className="text-[#7f1d1d]/40 hover:text-[#7f1d1d] flex-shrink-0"
                    >
                      {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </button>
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    {!complaint.assignedTo && (
                      <Button size="sm" variant="outline" disabled={updating[complaint.id]}
                        className="rounded-full border-[#7f1d1d] text-[#7f1d1d] hover:bg-[#fee2e2]"
                        onClick={() => assignToMe(complaint)}>
                        <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Assign to Me
                      </Button>
                    )}
                    {isMine && (
                      <Button size="sm" variant="outline" disabled={updating[complaint.id]}
                        className="rounded-full border-[#fee2e2] text-[#7f1d1d]/70 hover:bg-[#fee2e2]"
                        onClick={() => unassign(complaint)}>
                        <UserMinus className="h-3.5 w-3.5 mr-1.5" /> Unassign
                      </Button>
                    )}
                  </div>

                  {complaint.adminNotes && !isExpanded && (
                    <p className="text-xs text-[#7f1d1d]/40 mt-2 italic">Notes: {complaint.adminNotes}</p>
                  )}
                </div>

                {isExpanded && (
                  <div className="border-t border-[#fee2e2] p-5 space-y-4 bg-[#fee2e2]">
                    <div>
                      <p className="text-xs font-medium text-[#7f1d1d]/50 uppercase tracking-wide mb-1.5">Description</p>
                      <p className="text-sm text-[#7f1d1d] whitespace-pre-wrap">{complaint.description}</p>
                    </div>

                    <div className="space-y-3">
                      <p className="text-xs font-medium text-[#7f1d1d]/50 uppercase tracking-wide">Update Status</p>
                      <div className="flex flex-wrap gap-2">
                        {STATUS_OPTIONS.map((s) => (
                          <button
                            key={s}
                            onClick={() => setDraftStatus((prev) => ({ ...prev, [complaint.id]: s }))}
                            className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                              currentStatus === s
                                ? `${STATUS_BADGE[s] ?? ""} border-current`
                                : "border-[#fee2e2] text-[#7f1d1d]/70 hover:bg-[#fef2f2] hover:text-[#7f1d1d]"
                            }`}
                          >
                            {s.replace("_", " ")}
                          </button>
                        ))}
                      </div>
                      <textarea
                        value={currentNotes}
                        onChange={(e) => setDraftNotes((prev) => ({ ...prev, [complaint.id]: e.target.value }))}
                        placeholder="Resolution notes (visible to reporter when resolved/dismissed)…"
                        rows={3}
                        className="w-full resize-none rounded-lg border border-[#fee2e2] bg-[#fef2f2] px-4 py-2.5 text-sm text-[#7f1d1d] placeholder:text-[#7f1d1d]/40 focus:border-[#7f1d1d] focus:outline-none"
                      />
                      <div className="flex items-center gap-3">
                        <Button size="sm" className="rounded-full bg-[#7f1d1d] hover:bg-[#991b1b] text-[#fef2f2]"
                          disabled={updating[complaint.id]}
                          onClick={() => updateComplaint(complaint)}>
                          {updating[complaint.id] ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                          Update
                        </Button>
                        {saved[complaint.id] && (
                          <span className="flex items-center gap-1 text-xs text-[#7f1d1d]">
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

      {pagination.pages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#fee2e2] text-[#7f1d1d]/70 hover:bg-[#fee2e2] disabled:opacity-40">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-[#7f1d1d]/70">Page {page} of {pagination.pages}</span>
          <button onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))} disabled={page >= pagination.pages}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#fee2e2] text-[#7f1d1d]/70 hover:bg-[#fee2e2] disabled:opacity-40">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
