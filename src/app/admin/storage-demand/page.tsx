"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, MapPin, Snowflake, Warehouse, Users, Copy, CheckCircle2 } from "lucide-react";

interface RegionDemand {
  region: string;
  farmerCount: number;
  locatedFarmerCount: number;
  unlocatedFarmerCount: number;
  strandedFarmerCount: number;
  approvedFacilityCount: number;
  approvedCapacityTonnes: number;
  facilitiesByType: { COLD_CHAIN: number; HERMETIC_DRY: number };
  bookings: {
    total: number;
    pending: number;
    confirmed: number;
    rejected: number;
    droppedOff: number;
    rejectedValueGHS: number;
    pipelineValueGHS: number;
  };
  rejectionRate: number | null;
  topDistricts: { district: string; bookingCount: number; rejectedCount: number }[];
  sampleRejectionNotes: { cropType: string; quantity: number; unit: string; note: string }[];
  gapSeverity: "no_facility" | "high" | "moderate" | "low";
}

interface DemandSummary {
  totalStrandedFarmers: number;
  totalRejectedValueGHS: number;
  totalPipelineValueGHS: number;
  regionsWithNoFacility: number;
  strandedKmThreshold: number;
}

const SEVERITY_LABEL: Record<RegionDemand["gapSeverity"], string> = {
  no_facility: "No approved facility",
  high: "High rejection rate",
  moderate: "Moderate gap",
  low: "Low gap",
};

const SEVERITY_BADGE: Record<RegionDemand["gapSeverity"], string> = {
  no_facility: "bg-red-100 text-red-700",
  high: "bg-red-100 text-red-700",
  moderate: "bg-amber-100 text-amber-700",
  low: "bg-[#d3fa99] text-[#1c3a13]",
};

const PERIODS = [
  { value: "", label: "All time" },
  { value: "90", label: "Last 90 days" },
  { value: "30", label: "Last 30 days" },
];

function formatGHS(value: number): string {
  return `GHS ${Math.round(value).toLocaleString()}`;
}

function buildPitchSummary(r: RegionDemand): string {
  const lines = [
    `${r.region} — Storage Capacity Gap`,
    `${r.farmerCount} active farmer${r.farmerCount === 1 ? "" : "s"}, ${r.approvedFacilityCount} approved storage facilit${r.approvedFacilityCount === 1 ? "y" : "ies"}` +
      (r.approvedCapacityTonnes ? ` (~${r.approvedCapacityTonnes}t advisory capacity).` : "."),
    `${r.bookings.total} storage booking${r.bookings.total === 1 ? "" : "s"} requested (${formatGHS(r.bookings.pipelineValueGHS)} in produce value); ${r.bookings.rejected} rejected (${formatGHS(r.bookings.rejectedValueGHS)} lost to date).`,
  ];
  if (r.locatedFarmerCount > 0) {
    lines.push(`${r.strandedFarmerCount} of ${r.locatedFarmerCount} located farmers have no approved facility within 50km.`);
  }
  if (r.topDistricts.length > 0) {
    lines.push(`Highest demand: ${r.topDistricts.slice(0, 3).map((d) => `${d.district} (${d.bookingCount})`).join(", ")}.`);
  }
  return lines.join("\n");
}

export default function AdminStorageDemandPage() {
  const [regions, setRegions] = useState<RegionDemand[]>([]);
  const [summary, setSummary] = useState<DemandSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("");
  const [copiedRegion, setCopiedRegion] = useState<string | null>(null);

  const fetchDemand = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (period) params.set("days", period);
    const res = await fetch(`/api/admin/storage-demand?${params}`);
    const data = await res.json();
    setRegions(data.regions ?? []);
    setSummary(data.summary ?? null);
    setLoading(false);
  }, [period]);

  useEffect(() => { fetchDemand(); }, [fetchDemand]);

  async function copyPitch(r: RegionDemand) {
    await navigator.clipboard.writeText(buildPitchSummary(r));
    setCopiedRegion(r.region);
    setTimeout(() => setCopiedRegion((prev) => (prev === r.region ? null : prev)), 1800);
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-light tracking-tight text-[#1c3a13]">Unmet Storage Demand</h1>
          <p className="text-sm text-[#1c3a13]/50 mt-1 max-w-2xl">
            Where farmer demand for storage outruns approved facility capacity — the evidence base for
            pitching new capacity to an NGO, DFI, or bank, not an operations screen. &quot;Stranded&quot; means a
            located farmer has no approved facility within {summary?.strandedKmThreshold ?? 50}km.
          </p>
        </div>
        <div className="flex gap-1 bg-[#fcfcf7] border border-[#eeeee9] rounded-xl p-1 h-fit">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                period === p.value ? "bg-[#1c3a13] text-[#fcfcf7]" : "text-[#1c3a13]/70 hover:bg-[#eeeee9]"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-[#1c3a13]/40" /></div>
      ) : (
        <>
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatTile label="Stranded farmers" value={String(summary.totalStrandedFarmers)} />
              <StatTile label="Regions with no facility" value={String(summary.regionsWithNoFacility)} />
              <StatTile label="Rejected booking value" value={formatGHS(summary.totalRejectedValueGHS)} />
              <StatTile label="Total demand pipeline" value={formatGHS(summary.totalPipelineValueGHS)} />
            </div>
          )}

          {regions.length === 0 ? (
            <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] py-20 text-center">
              <div className="text-5xl mb-3">🗺️</div>
              <p className="text-[#1c3a13]/50">No farmer, facility, or booking activity to assess yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {regions.map((r) => (
                <div key={r.region} className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] p-5 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-[#1c3a13] text-base">{r.region}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_BADGE[r.gapSeverity]}`}>
                        {SEVERITY_LABEL[r.gapSeverity]}
                      </span>
                    </div>
                    <button
                      onClick={() => copyPitch(r)}
                      className="flex items-center gap-1.5 rounded-full border border-[#eeeee9] px-3 py-1.5 text-xs font-medium text-[#1c3a13]/70 hover:bg-[#eeeee9] transition-colors"
                    >
                      {copiedRegion === r.region ? (
                        <><CheckCircle2 className="h-3.5 w-3.5" /> Copied</>
                      ) : (
                        <><Copy className="h-3.5 w-3.5" /> Copy pitch summary</>
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <Metric icon={<Users className="h-3.5 w-3.5" />} label="Active farmers" value={String(r.farmerCount)} />
                    <Metric
                      icon={<Warehouse className="h-3.5 w-3.5" />}
                      label="Approved facilities"
                      value={`${r.approvedFacilityCount}${r.approvedCapacityTonnes ? ` (~${r.approvedCapacityTonnes}t)` : ""}`}
                    />
                    <Metric
                      icon={<Snowflake className="h-3.5 w-3.5" />}
                      label="Cold chain / hermetic-dry"
                      value={`${r.facilitiesByType.COLD_CHAIN} / ${r.facilitiesByType.HERMETIC_DRY}`}
                    />
                    <Metric
                      icon={<MapPin className="h-3.5 w-3.5" />}
                      label="Stranded (>50km)"
                      value={r.locatedFarmerCount > 0 ? `${r.strandedFarmerCount} of ${r.locatedFarmerCount}` : "—"}
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm border-t border-[#eeeee9] pt-3">
                    <Metric label="Bookings requested" value={String(r.bookings.total)} />
                    <Metric label="Rejected" value={String(r.bookings.rejected)} />
                    <Metric
                      label="Rejection rate"
                      value={r.rejectionRate !== null ? `${Math.round(r.rejectionRate * 100)}%` : "—"}
                    />
                    <Metric label="Rejected value" value={formatGHS(r.bookings.rejectedValueGHS)} />
                  </div>

                  {r.topDistricts.length > 0 && (
                    <div className="border-t border-[#eeeee9] pt-3">
                      <p className="text-xs font-medium text-[#1c3a13]/50 mb-1.5">Highest-demand districts</p>
                      <div className="flex flex-wrap gap-2">
                        {r.topDistricts.map((d) => (
                          <span key={d.district} className="rounded-full bg-[#eeeee9] px-2.5 py-1 text-xs text-[#1c3a13]/70">
                            {d.district} · {d.bookingCount} booking{d.bookingCount === 1 ? "" : "s"}
                            {d.rejectedCount > 0 ? ` (${d.rejectedCount} rejected)` : ""}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {r.sampleRejectionNotes.length > 0 && (
                    <div className="border-t border-[#eeeee9] pt-3 space-y-1.5">
                      <p className="text-xs font-medium text-[#1c3a13]/50">Facility rejection notes</p>
                      {r.sampleRejectionNotes.map((n, i) => (
                        <p key={i} className="text-xs text-[#1c3a13]/60 italic">
                          &quot;{n.note}&quot; — {n.quantity} {n.unit} of {n.cropType}
                        </p>
                      ))}
                    </div>
                  )}

                  {r.unlocatedFarmerCount > 0 && (
                    <p className="text-xs text-[#1c3a13]/40">
                      {r.unlocatedFarmerCount} farmer{r.unlocatedFarmerCount === 1 ? "" : "s"} in this region have no
                      recorded location and aren&apos;t counted in the stranded figure above.
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] p-4">
      <p className="text-xs text-[#1c3a13]/50">{label}</p>
      <p className="text-xl font-light text-[#1c3a13] mt-1">{value}</p>
    </div>
  );
}

function Metric({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-[#1c3a13]/50 flex items-center gap-1">{icon}{label}</p>
      <p className="text-[#1c3a13] font-medium mt-0.5">{value}</p>
    </div>
  );
}
