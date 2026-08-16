"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  ChevronLeft, ChevronRight, Loader2, Activity, Users, Layers, Smartphone,
  TrendingUp, TrendingDown, Minus, Sparkles, Calendar, MapPin, ShieldCheck, Monitor,
  Columns3, CheckSquare, Square, ChevronDown,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface EventRow {
  id: string;
  createdAt: string;
  type: string;
  sessionId: string;
  userId: string | null;
  userName: string | null;
  ip: string;
  userAgent: string | null;
  columns: Record<string, unknown>;
  lat: number | null;
  lon: number | null;
  place: string | null;
}

interface Pagination {
  page: number;
  total: number;
  pages: number;
}

interface BreakdownRow {
  key: string;
  count: number;
  pct: number;
}

interface Metric {
  value: number;
  growth: number | null;
}

interface Summary {
  totals: {
    totalEvents: Metric;
    uniqueSessions: Metric;
    uniqueUsers: Metric;
    distinctEventTypes: Metric;
    avgEventsPerSession: Metric;
  };
  deviceBreakdown: BreakdownRow[];
  osBreakdown: BreakdownRow[];
  typeBreakdown: BreakdownRow[];
  locationBreakdown: BreakdownRow[];
  filterOptions: { locations: string[]; roles: string[]; os: string[] };
}

const TYPE_TABS = [
  { value: "", label: "All" },
  { value: "page_view", label: "Page View" },
  { value: "click", label: "Click" },
  { value: "scroll", label: "Scroll" },
  { value: "product_view", label: "Product View" },
  { value: "farmer_view", label: "Farmer View" },
  { value: "equipment_view", label: "Equipment View" },
  { value: "location_update", label: "Location Update" },
];

const RANGE_TABS = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
  { value: "custom", label: "Custom" },
];

// Sequential blue ramp, darkest = highest rank — bars are read by rank, not identity.
const SEQ_STEPS = ["#1c5cab", "#256abf", "#2a78d6", "#3987e5", "#5598e7", "#6da7ec", "#86b6ef"];
const OTHER_COLOR = "#c4c7c4";

function formatCell(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function formatTimestamp(iso: string): string {
  return new Intl.DateTimeFormat("en-GH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

interface ColumnDef {
  key: string;
  label: string;
  className?: string;
  render: (e: EventRow) => React.ReactNode;
}

const FIXED_COLUMNS: ColumnDef[] = [
  { key: "time", label: "Time", className: "text-[#1c3a13]/70 text-xs", render: (e) => formatTimestamp(e.createdAt) },
  {
    key: "type",
    label: "Type",
    render: (e) => (
      <span className="rounded-full bg-[#eeeee9] px-2 py-0.5 text-xs font-medium text-[#1c3a13]">{e.type}</span>
    ),
  },
  { key: "user", label: "User", className: "text-[#1c3a13]", render: (e) => e.userName ?? "—" },
  { key: "session", label: "Session", className: "text-[#1c3a13]/50 text-xs font-mono", render: (e) => e.sessionId.slice(0, 8) },
  {
    key: "ip",
    label: "IP",
    className: "text-[#1c3a13]/70 text-xs font-mono",
    render: (e) => (e.ip && e.ip !== "unknown" ? <IpCell ip={e.ip} /> : e.ip),
  },
  { key: "location", label: "Location", className: "text-[#1c3a13]/70", render: (e) => e.place ?? "—" },
];

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

interface IpLookupResult {
  country: string | null;
  regionName: string | null;
  city: string | null;
  isp: string | null;
  org: string | null;
  query: string;
}

// Shared across every IpCell instance — the same visitor IP repeats across many rows,
// so one lookup per IP (not per row) keeps this off ip-api.com's rate limit.
const ipLookupCache = new Map<string, IpLookupResult | "error">();

function IpTooltipBody({ state }: { state: IpLookupResult | "loading" | "error" | undefined }) {
  if (!state || state === "loading") {
    return (
      <div className="flex items-center gap-1.5 text-[#1c3a13]/50">
        <Loader2 className="h-3 w-3 animate-spin" />
        Looking up…
      </div>
    );
  }
  if (state === "error") {
    return <p className="text-[#1c3a13]/50">No location data available.</p>;
  }
  const rows: [string, string | null][] = [
    ["City", state.city],
    ["Region", state.regionName],
    ["Country", state.country],
    ["ISP", state.isp],
    ["Org", state.org],
  ];
  return (
    <dl className="space-y-0.5">
      {rows.filter(([, v]) => v).map(([label, value]) => (
        <div key={label} className="flex gap-2">
          <dt className="text-[#1c3a13]/50 w-14 flex-shrink-0">{label}</dt>
          <dd className="text-[#1c3a13] font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function IpCell({ ip }: { ip: string }) {
  const [state, setState] = useState<IpLookupResult | "loading" | "error" | undefined>(
    ipLookupCache.get(ip)
  );

  async function load() {
    if (ipLookupCache.has(ip)) return;
    setState("loading");
    try {
      const res = await fetch(`/api/admin/ip-lookup?ip=${encodeURIComponent(ip)}`);
      if (!res.ok) throw new Error("lookup failed");
      const data: IpLookupResult = await res.json();
      ipLookupCache.set(ip, data);
      setState(data);
    } catch {
      ipLookupCache.set(ip, "error");
      setState("error");
    }
  }

  return (
    <Tooltip onOpenChange={(open) => { if (open) load(); }}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="underline decoration-dotted decoration-[#1c3a13]/30 underline-offset-2 hover:text-[#1c3a13]"
        >
          {ip}
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <IpTooltipBody state={state} />
      </TooltipContent>
    </Tooltip>
  );
}

function GrowthBadge({ growth }: { growth: number | null }) {
  if (growth === null) {
    return <span className="inline-flex items-center gap-0.5 text-xs font-medium text-[#1c3a13]/40"><Sparkles className="h-3 w-3" />New</span>;
  }
  if (growth === 0) {
    return <span className="inline-flex items-center gap-0.5 text-xs font-medium text-[#1c3a13]/40"><Minus className="h-3 w-3" />No change</span>;
  }
  const up = growth > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${up ? "text-[#006300]" : "text-red-600"}`}>
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {up ? "+" : ""}{growth}% vs prior period
    </span>
  );
}

function StatTile({ icon: Icon, label, metric, format }: { icon: typeof Activity; label: string; metric: Metric; format?: (n: number) => string }) {
  return (
    <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#eeeee9]">
          <Icon className="h-3.5 w-3.5 text-[#1c3a13]" />
        </div>
        <p className="text-xs font-medium text-[#1c3a13]/50 uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-2xl font-bold text-[#1c3a13] mb-1">{format ? format(metric.value) : metric.value.toLocaleString()}</p>
      <GrowthBadge growth={metric.growth} />
    </div>
  );
}

function BreakdownCard({ title, rows, emptyLabel }: { title: string; rows: BreakdownRow[]; emptyLabel: string }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] p-5">
      <h3 className="text-sm font-medium text-[#1c3a13] mb-4">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-[#1c3a13]/40 py-6 text-center">{emptyLabel}</p>
      ) : (
        <div className="space-y-2.5">
          {rows.map((r, i) => (
            <div key={r.key}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-[#1c3a13] font-medium truncate pr-2">{r.key}</span>
                <span className="text-[#1c3a13]/50 flex-shrink-0 tabular-nums">{r.count} · {r.pct}%</span>
              </div>
              <div className="h-2 rounded-full bg-[#eeeee9] overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(3, (r.count / max) * 100)}%`,
                    backgroundColor: r.key === "Other" ? OTHER_COLOR : SEQ_STEPS[i % SEQ_STEPS.length],
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [summary, setSummary] = useState<Summary | null>(null);

  const [range, setRange] = useState("month");
  const [customFrom, setCustomFrom] = useState(todayStr());
  const [customTo, setCustomTo] = useState(todayStr());
  const [location, setLocation] = useState("");
  const [role, setRole] = useState("");
  const [os, setOs] = useState("");

  const filterParams = useMemo(() => {
    const p = new URLSearchParams({ range });
    if (range === "custom") { p.set("from", customFrom); p.set("to", customTo); }
    if (location) p.set("location", location);
    if (role) p.set("role", role);
    if (os) p.set("os", os);
    return p;
  }, [range, customFrom, customTo, location, role, os]);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams(filterParams);
    params.set("page", String(page));
    params.set("limit", "15");
    if (type) params.set("type", type);
    const res = await fetch(`/api/admin/events?${params}`);
    const data = await res.json();
    setEvents(data.data ?? []);
    setPagination(data.pagination ?? { page: 1, total: 0, pages: 1 });
    setLoading(false);
  }, [type, page, filterParams]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  useEffect(() => {
    fetch(`/api/admin/events/summary?${filterParams}`).then((r) => r.json()).then(setSummary).catch(() => {});
  }, [filterParams]);

  // Data shape varies per event type — derive one column per distinct key seen on this page.
  const dataColumns = useMemo(() => {
    const keys = new Set<string>();
    for (const e of events) for (const k of Object.keys(e.columns)) keys.add(k);
    return Array.from(keys).sort();
  }, [events]);

  const columnDefs = useMemo<ColumnDef[]>(() => [
    ...FIXED_COLUMNS,
    ...dataColumns.map((key) => ({
      key: `data:${key}`,
      label: key,
      className: "text-[#1c3a13]/70 max-w-[240px] truncate",
      render: (e: EventRow) => formatCell(e.columns[key]),
    })),
  ], [dataColumns]);

  // Columns not in this set are shown — new/unseen columns default to visible.
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const columnPickerRef = useRef<HTMLDivElement>(null);
  const visibleColumnDefs = columnDefs.filter((c) => !hiddenColumns.has(c.key));

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (columnPickerRef.current && !columnPickerRef.current.contains(event.target as Node)) {
        setShowColumnPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggleColumn(key: string) {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function resetToPageOne<T>(setter: (v: T) => void) {
    return (v: T) => { setter(v); setPage(1); };
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-light tracking-tight text-[#1c3a13]">Analytics Events</h1>
        <p className="text-sm text-[#1c3a13]/50 mt-1">{pagination.total} events matching current filters</p>
      </div>

      {/* Dashboard filters — affect KPIs, breakdowns, trend, and the event log below */}
      <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Calendar className="h-4 w-4 text-[#1c3a13]/40 flex-shrink-0" />
          <div className="flex gap-1 bg-[#eeeee9] rounded-xl p-1 flex-wrap">
            {RANGE_TABS.map((t) => (
              <button
                key={t.value}
                onClick={() => resetToPageOne(setRange)(t.value)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  range === t.value ? "bg-[#1c3a13] text-[#fcfcf7]" : "text-[#1c3a13]/70 hover:bg-[#fcfcf7]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {range === "custom" && (
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="date" value={customFrom} max={customTo}
                onChange={(e) => resetToPageOne(setCustomFrom)(e.target.value)}
                className="rounded-lg border border-[#eeeee9] px-2 py-1.5 text-sm text-[#1c3a13]"
              />
              <span className="text-[#1c3a13]/40 text-sm">to</span>
              <input
                type="date" value={customTo} min={customFrom} max={todayStr()}
                onChange={(e) => resetToPageOne(setCustomTo)(e.target.value)}
                className="rounded-lg border border-[#eeeee9] px-2 py-1.5 text-sm text-[#1c3a13]"
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-[#1c3a13]/40" />
            <select
              value={location}
              onChange={(e) => resetToPageOne(setLocation)(e.target.value)}
              className="rounded-lg border border-[#eeeee9] px-2 py-1.5 text-sm text-[#1c3a13] bg-[#fcfcf7]"
            >
              <option value="">All Locations</option>
              {summary?.filterOptions.locations.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#1c3a13]/40" />
            <select
              value={role}
              onChange={(e) => resetToPageOne(setRole)(e.target.value)}
              className="rounded-lg border border-[#eeeee9] px-2 py-1.5 text-sm text-[#1c3a13] bg-[#fcfcf7]"
            >
              <option value="">All Roles</option>
              {(summary?.filterOptions.roles ?? []).map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Monitor className="h-4 w-4 text-[#1c3a13]/40" />
            <select
              value={os}
              onChange={(e) => resetToPageOne(setOs)(e.target.value)}
              className="rounded-lg border border-[#eeeee9] px-2 py-1.5 text-sm text-[#1c3a13] bg-[#fcfcf7]"
            >
              <option value="">All OS</option>
              {(summary?.filterOptions.os ?? []).map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {summary && (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatTile icon={Activity} label="Total Events" metric={summary.totals.totalEvents} />
            <StatTile icon={Users} label="Unique Sessions" metric={summary.totals.uniqueSessions} />
            <StatTile icon={Users} label="Unique Users" metric={summary.totals.uniqueUsers} />
            <StatTile icon={Layers} label="Event Types" metric={summary.totals.distinctEventTypes} />
            <StatTile icon={Smartphone} label="Avg / Session" metric={summary.totals.avgEventsPerSession} />
          </div>

          {/* Breakdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <BreakdownCard title="Device Type" rows={summary.deviceBreakdown} emptyLabel="No device data yet." />
            <BreakdownCard title="Operating System" rows={summary.osBreakdown} emptyLabel="No OS data yet." />
            <BreakdownCard title="Top Locations" rows={summary.locationBreakdown} emptyLabel="No location data yet." />
            <BreakdownCard title="Event Type Distribution" rows={summary.typeBreakdown} emptyLabel="No events yet." />
          </div>
        </>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <TrendingUp className="h-4 w-4 text-[#1c3a13]/40" />
        <span className="text-sm text-[#1c3a13]/50 mr-1">Event log</span>
        <div className="flex gap-1 bg-[#fcfcf7] border border-[#eeeee9] rounded-xl p-1 flex-wrap">
          {TYPE_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => resetToPageOne(setType)(t.value)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                type === t.value
                  ? "bg-[#1c3a13] text-[#fcfcf7]"
                  : "text-[#1c3a13]/70 hover:bg-[#eeeee9] hover:text-[#1c3a13]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Column visibility picker */}
        <div className="relative ml-auto" ref={columnPickerRef}>
          <button
            onClick={() => setShowColumnPicker((v) => !v)}
            className="flex items-center gap-1.5 rounded-xl border border-[#eeeee9] bg-[#fcfcf7] px-3 py-1.5 text-sm font-medium text-[#1c3a13] hover:bg-[#eeeee9] transition-colors"
          >
            <Columns3 className="h-4 w-4" />
            Columns ({visibleColumnDefs.length}/{columnDefs.length})
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showColumnPicker ? "rotate-180" : ""}`} />
          </button>
          {showColumnPicker && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-[#eeeee9] bg-[#fcfcf7] shadow-lg z-10 py-2">
              <div className="flex items-center justify-between px-3 pb-2 border-b border-[#eeeee9]">
                <button
                  onClick={() => setHiddenColumns(new Set())}
                  className="text-xs font-medium text-[#1c3a13] hover:underline"
                >
                  Select all
                </button>
                <button
                  onClick={() => setHiddenColumns(new Set(columnDefs.map((c) => c.key)))}
                  className="text-xs font-medium text-[#1c3a13]/50 hover:underline"
                >
                  Unselect all
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto py-1">
                {columnDefs.map((c) => {
                  const visible = !hiddenColumns.has(c.key);
                  return (
                    <button
                      key={c.key}
                      onClick={() => toggleColumn(c.key)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left text-[#1c3a13] hover:bg-[#eeeee9] transition-colors"
                    >
                      {visible ? (
                        <CheckSquare className="h-4 w-4 text-[#1c3a13] flex-shrink-0" />
                      ) : (
                        <Square className="h-4 w-4 text-[#1c3a13]/30 flex-shrink-0" />
                      )}
                      <span className="truncate">{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-[#1c3a13]/40" /></div>
        ) : events.length === 0 ? (
          <div className="text-center py-16 text-[#1c3a13]/40">No events found.</div>
        ) : (
          <TooltipProvider delayDuration={150}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#eeeee9] bg-[#eeeee9] text-xs text-[#1c3a13] uppercase tracking-wide">
                    {visibleColumnDefs.map((c) => (
                      <th key={c.key} className="px-4 py-3 text-left font-medium whitespace-nowrap">{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eeeee9]">
                  {events.map((e) => (
                    <tr key={e.id} className="hover:bg-[#eeeee9] transition-colors">
                      {visibleColumnDefs.map((c) => (
                        <td key={c.key} className={`px-4 py-3 whitespace-nowrap ${c.className ?? ""}`}>
                          {c.render(e)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TooltipProvider>
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#eeeee9] text-[#1c3a13]/70 hover:bg-[#eeeee9] disabled:opacity-40">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-[#1c3a13]/70">Page {page} of {pagination.pages}</span>
          <button
            onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))} disabled={page >= pagination.pages}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#eeeee9] text-[#1c3a13]/70 hover:bg-[#eeeee9] disabled:opacity-40">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
