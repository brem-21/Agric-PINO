"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, AlertTriangle } from "lucide-react";

const ROLE_OPTIONS = [
  { value: "", label: "All Roles" },
  { value: "FARMER", label: "Farmer" },
  { value: "BUYER", label: "Buyer" },
  { value: "LOGISTICS", label: "Logistics" },
  { value: "STORAGE_FACILITY", label: "Storage Facility" },
];

const THEMES = {
  green: { text: "#1c3a13", bg: "#fcfcf7", border: "#eeeee9", roleBadge: "bg-[#eeeee9] text-[#1c3a13]" },
  red: { text: "#7f1d1d", bg: "#fef2f2", border: "#fee2e2", roleBadge: "bg-[#fee2e2] text-[#7f1d1d]" },
};

interface Row {
  user: { id: string; name: string; phone: string; role: string };
  count: number;
}

interface RepeatOffendersTableProps {
  theme?: keyof typeof THEMES;
}

export function RepeatOffendersTable({ theme = "green" }: RepeatOffendersTableProps) {
  const t = THEMES[theme];
  const [rows, setRows] = useState<Row[]>([]);
  const [threshold, setThreshold] = useState(5);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("");

  const fetchRows = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (role) params.set("role", role);
    const res = await fetch(`/api/admin/repeat-offenders?${params}`);
    const data = await res.json();
    setRows(data.rows ?? []);
    setThreshold(data.threshold ?? 5);
    setLoading(false);
  }, [role]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-light tracking-tight" style={{ color: t.text }}>Repeat Offenders</h1>
          <p className="text-sm mt-1" style={{ color: t.text, opacity: 0.5 }}>
            Users who have been the target of complaints, ranked by count. Rows at {threshold}+ are flagged for review.
          </p>
        </div>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="rounded-full border px-3 py-1.5 text-sm font-medium focus:outline-none"
          style={{ borderColor: t.border, backgroundColor: t.bg, color: t.text }}
        >
          {ROLE_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin" style={{ color: t.text, opacity: 0.4 }} /></div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border py-20 text-center" style={{ backgroundColor: t.bg, borderColor: t.border }}>
          <div className="text-5xl mb-3">✅</div>
          <p style={{ color: t.text, opacity: 0.5 }}>No one has been reported yet.</p>
        </div>
      ) : (
        <div className="rounded-2xl border overflow-hidden overflow-x-auto" style={{ backgroundColor: t.bg, borderColor: t.border }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs font-medium uppercase tracking-wide" style={{ borderColor: t.border, color: t.text, opacity: 0.5 }}>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Phone</th>
                <th className="px-5 py-3">Times Reported</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ user, count }) => (
                <tr
                  key={user.id}
                  className={`border-b last:border-0 ${count >= threshold ? "bg-red-50" : ""}`}
                  style={{ borderColor: t.border }}
                >
                  <td className="px-5 py-3 font-medium" style={{ color: t.text }}>{user.name}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${t.roleBadge}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-5 py-3" style={{ color: t.text, opacity: 0.7 }}>{user.phone}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center gap-1.5 font-medium ${count >= threshold ? "text-red-700" : ""}`} style={count >= threshold ? undefined : { color: t.text }}>
                      {count >= threshold && <AlertTriangle className="h-3.5 w-3.5" />}
                      {count}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
