"use client";

import { useEffect, useState, useCallback } from "react";
import { Check, X, ChevronLeft, ChevronRight, Loader2, MapPin, Snowflake, Warehouse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

const STORAGE_TYPE_LABEL: Record<string, string> = {
  COLD_CHAIN: "Cold Chain",
  HERMETIC_DRY: "Hermetic/Dry",
};

const APPROVAL_BADGE: Record<string, string> = {
  PENDING: "bg-[#eeeee9] text-[#1c3a13]",
  APPROVED: "bg-[#d3fa99] text-[#1c3a13]",
  REJECTED: "bg-red-100 text-red-700",
};

interface Facility {
  id: string;
  name: string;
  description: string | null;
  location: string;
  storageTypes: string[];
  capacityTonnes: number | null;
  acceptedCategories: string[];
  operatingHours: string | null;
  approvalStatus: string;
  createdAt: string;
  user: { id: string; name: string; phone: string };
}

interface Pagination { page: number; total: number; pages: number }

const TABS = [
  { value: "PENDING", label: "Pending Approval" },
  { value: "", label: "All Facilities" },
];

export default function AdminStorageFacilitiesPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("PENDING");
  const [page, setPage] = useState(1);
  const [acting, setActing] = useState<Record<string, string>>({});

  const fetchFacilities = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "12" });
    if (tab) params.set("status", tab);
    const res = await fetch(`/api/admin/storage-facilities?${params}`);
    const data = await res.json();
    setFacilities(data.data ?? []);
    setPagination(data.pagination ?? { page: 1, total: 0, pages: 1 });
    setLoading(false);
  }, [tab, page]);

  useEffect(() => { fetchFacilities(); }, [fetchFacilities]);

  async function act(facilityId: string, approvalStatus: "APPROVED" | "REJECTED") {
    setActing((prev) => ({ ...prev, [facilityId]: approvalStatus }));
    try {
      const res = await fetch(`/api/admin/storage-facilities/${facilityId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalStatus }),
      });
      if (res.ok) {
        if (tab === "PENDING") {
          setFacilities((prev) => prev.filter((f) => f.id !== facilityId));
          setPagination((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }));
        } else {
          setFacilities((prev) => prev.map((f) => (f.id === facilityId ? { ...f, approvalStatus } : f)));
        }
      }
    } finally {
      setActing((prev) => { const n = { ...prev }; delete n[facilityId]; return n; });
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-light tracking-tight text-[#1c3a13]">Storage Facility Approvals</h1>
        <p className="text-sm text-[#1c3a13]/50 mt-1">{pagination.total} facilities</p>
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
      ) : facilities.length === 0 ? (
        <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] py-20 text-center">
          <div className="text-5xl mb-3">✅</div>
          <p className="text-[#1c3a13]/50">{tab === "PENDING" ? "No facilities pending approval." : "No facilities found."}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {facilities.map((facility) => (
            <div key={facility.id} className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] overflow-hidden">
              <div className="flex gap-4 p-5">
                <div className="h-14 w-14 rounded-xl overflow-hidden flex-shrink-0 bg-[#eeeee9] flex items-center justify-center border border-[#eeeee9]">
                  {facility.storageTypes.includes("COLD_CHAIN")
                    ? <Snowflake className="h-6 w-6 text-blue-500" />
                    : <Warehouse className="h-6 w-6 text-[#1c3a13]/50" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-start gap-2 mb-1">
                    <h3 className="font-medium text-[#1c3a13] text-base">{facility.name}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${APPROVAL_BADGE[facility.approvalStatus] ?? "bg-[#eeeee9] text-[#1c3a13]"}`}>
                      {facility.approvalStatus}
                    </span>
                  </div>
                  <p className="text-sm text-[#1c3a13]/70">
                    {facility.storageTypes.map((t) => STORAGE_TYPE_LABEL[t] ?? t).join(" · ") || "No storage type set"}
                    {facility.capacityTonnes ? ` · ~${facility.capacityTonnes}t capacity` : ""}
                  </p>
                  <div className="flex flex-wrap gap-3 text-xs text-[#1c3a13]/50 mt-1.5">
                    <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{facility.location}</span>
                    <span>Submitted {formatDate(facility.createdAt)}</span>
                  </div>
                  <p className="text-xs text-[#1c3a13]/40 mt-1">{facility.user.name} · {facility.user.phone}</p>
                  {facility.description && (
                    <p className="text-xs text-[#1c3a13]/50 mt-1.5 italic">{facility.description}</p>
                  )}
                </div>
              </div>

              {facility.approvalStatus === "PENDING" && (
                <div className="border-t border-[#eeeee9] px-5 py-3 bg-[#eeeee9] flex flex-wrap items-center gap-3">
                  <Button
                    size="sm"
                    className="rounded-full bg-[#1c3a13] hover:bg-[#2a5219] text-[#fcfcf7]"
                    disabled={!!acting[facility.id]}
                    onClick={() => act(facility.id, "APPROVED")}
                  >
                    {acting[facility.id] === "APPROVED" ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                    Approve
                  </Button>
                  <Button size="sm" variant="outline"
                    className="rounded-full border-red-600 text-red-600 hover:bg-red-50"
                    disabled={!!acting[facility.id]}
                    onClick={() => act(facility.id, "REJECTED")}>
                    {acting[facility.id] === "REJECTED" ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <X className="h-3.5 w-3.5 mr-1" />}
                    Reject
                  </Button>
                </div>
              )}
            </div>
          ))}
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
