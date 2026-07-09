"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Search, ChevronLeft, ChevronRight, CheckCircle, XCircle, Loader2, ExternalLink, UserX, UserCheck } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface AdminUser {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  role: string;
  region: string | null;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
}

interface Pagination {
  page: number;
  total: number;
  pages: number;
}

const ROLE_TABS = [
  { value: "", label: "All" },
  { value: "FARMER", label: "Farmers" },
  { value: "BUYER", label: "Buyers" },
  { value: "LOGISTICS", label: "Logistics" },
  { value: "VENDOR", label: "Vendors" },
];

const ROLE_BADGE: Record<string, string> = {
  FARMER: "bg-[#eeeee9] text-[#1c3a13]",
  BUYER: "bg-[#eeeee9] text-[#1c3a13]",
  LOGISTICS: "bg-[#eeeee9] text-[#1c3a13]",
  VENDOR: "bg-[#eeeee9] text-[#1c3a13]",
  ADMIN: "bg-[#eeeee9] text-[#1c3a13]",
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (role) params.set("role", role);
    if (search) params.set("search", search);
    const res = await fetch(`/api/admin/users?${params}`);
    const data = await res.json();
    setUsers(data.data ?? []);
    setPagination(data.pagination ?? { page: 1, total: 0, pages: 1 });
    setLoading(false);
  }, [role, search, page]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  async function toggleActive(u: AdminUser) {
    const nextActive = !u.isActive;
    const label = nextActive ? "activate" : "deactivate";
    if (!window.confirm(`Are you sure you want to ${label} ${u.name}?`)) return;

    setTogglingId(u.id);
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextActive }),
      });
      if (res.ok) {
        setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, isActive: nextActive } : x)));
      }
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-light tracking-tight text-[#1c3a13]">Users</h1>
        <p className="text-sm text-[#1c3a13]/50 mt-1">{pagination.total} users registered</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1 bg-[#fcfcf7] border border-[#eeeee9] rounded-xl p-1 flex-wrap">
          {ROLE_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => { setRole(t.value); setPage(1); }}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                role === t.value
                  ? "bg-[#1c3a13] text-[#fcfcf7]"
                  : "text-[#1c3a13]/70 hover:bg-[#eeeee9] hover:text-[#1c3a13]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1c3a13]/40" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name or phone…"
            className="w-full rounded-lg border border-[#eeeee9] bg-[#fcfcf7] pl-9 pr-3 py-2 text-sm text-[#1c3a13] placeholder:text-[#1c3a13]/40 focus:border-[#1c3a13] focus:outline-none focus:ring-2 focus:ring-[#1c3a13]/20"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-[#1c3a13]/40" /></div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-[#1c3a13]/40">No users found.</div>
        ) : (
          <>
            {/* Desktop table */}
            <table className="hidden md:table w-full text-sm">
              <thead>
                <tr className="border-b border-[#eeeee9] bg-[#eeeee9] text-xs text-[#1c3a13] uppercase tracking-wide">
                  <th className="px-4 py-3 text-left font-medium">User</th>
                  <th className="px-4 py-3 text-left font-medium">Role</th>
                  <th className="px-4 py-3 text-left font-medium">Region</th>
                  <th className="px-4 py-3 text-left font-medium">Verified</th>
                  <th className="px-4 py-3 text-left font-medium">Active</th>
                  <th className="px-4 py-3 text-left font-medium">Joined</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eeeee9]">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-[#eeeee9] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#eeeee9] text-xs font-semibold text-[#1c3a13] flex-shrink-0">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-[#1c3a13]">{u.name}</p>
                          <p className="text-xs text-[#1c3a13]/40">{u.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_BADGE[u.role] ?? "bg-[#eeeee9] text-[#1c3a13]"}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#1c3a13]/50">{u.region ?? "—"}</td>
                    <td className="px-4 py-3">
                      {u.isVerified
                        ? <CheckCircle className="h-4 w-4 text-[#1c3a13]" />
                        : <XCircle className="h-4 w-4 text-[#c4c7c4]" />}
                    </td>
                    <td className="px-4 py-3">
                      {u.isActive
                        ? <span className="inline-block h-2 w-2 rounded-full bg-[#d3fa99]" />
                        : <span className="inline-block h-2 w-2 rounded-full bg-red-400" />}
                    </td>
                    <td className="px-4 py-3 text-[#1c3a13]/50 text-xs">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Link href={`/admin/users/${u.id}`}
                          className="flex items-center gap-1 text-xs font-medium text-[#1c3a13]/70 hover:text-[#1c3a13]">
                          View <ExternalLink className="h-3 w-3" />
                        </Link>
                        {u.role !== "ADMIN" && (
                          <button
                            onClick={() => toggleActive(u)}
                            disabled={togglingId === u.id}
                            className={`flex items-center gap-1 text-xs font-medium disabled:opacity-40 ${
                              u.isActive ? "text-red-600 hover:text-red-700" : "text-[#1c3a13]/70 hover:text-[#1c3a13]"
                            }`}
                          >
                            {togglingId === u.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : u.isActive ? (
                              <UserX className="h-3 w-3" />
                            ) : (
                              <UserCheck className="h-3 w-3" />
                            )}
                            {u.isActive ? "Deactivate" : "Activate"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-[#eeeee9]">
              {users.map((u) => (
                <div key={u.id} className="flex items-center gap-3 p-4 hover:bg-[#eeeee9]">
                  <Link href={`/admin/users/${u.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eeeee9] text-sm font-semibold text-[#1c3a13] flex-shrink-0">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-[#1c3a13] truncate">{u.name}</p>
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium flex-shrink-0 ${ROLE_BADGE[u.role] ?? "bg-[#eeeee9] text-[#1c3a13]"}`}>
                          {u.role}
                        </span>
                      </div>
                      <p className="text-xs text-[#1c3a13]/40">{u.phone}</p>
                    </div>
                    {u.isVerified && <CheckCircle className="h-4 w-4 text-[#1c3a13] flex-shrink-0" />}
                  </Link>
                  {u.role !== "ADMIN" && (
                    <button
                      onClick={() => toggleActive(u)}
                      disabled={togglingId === u.id}
                      aria-label={u.isActive ? "Deactivate" : "Activate"}
                      className={`flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0 disabled:opacity-40 ${
                        u.isActive ? "text-red-600 hover:bg-red-50" : "text-[#1c3a13]/70 hover:bg-[#eeeee9]"
                      }`}
                    >
                      {togglingId === u.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : u.isActive ? (
                        <UserX className="h-4 w-4" />
                      ) : (
                        <UserCheck className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
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
