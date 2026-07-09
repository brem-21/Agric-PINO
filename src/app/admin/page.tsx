"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  CheckSquare,
  AlertTriangle,
  ShoppingBag,
  ClipboardList,
  ArrowRight,
  Loader2,
} from "lucide-react";

interface Stats {
  totalUsers: number;
  usersByRole: { FARMER: number; BUYER: number; LOGISTICS: number; VENDOR: number };
  pendingListings: number;
  openComplaints: number;
  totalListings: number;
  totalOrders: number;
}

const ROLE_PILLS = [
  { key: "FARMER", label: "Farmers", color: "bg-[#eeeee9] text-[#1c3a13]" },
  { key: "BUYER", label: "Buyers", color: "bg-[#eeeee9] text-[#1c3a13]" },
  { key: "LOGISTICS", label: "Riders", color: "bg-[#eeeee9] text-[#1c3a13]" },
  { key: "VENDOR", label: "Vendors", color: "bg-[#eeeee9] text-[#1c3a13]" },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d) => { setStats(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#1c3a13]/40" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-light tracking-tight text-[#1c3a13]">Admin Dashboard</h1>
        <p className="text-sm text-[#1c3a13]/50 mt-1">Platform overview and management</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Total Users */}
        <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs font-medium text-[#1c3a13]/50 uppercase tracking-wide">Total Users</p>
              <p className="text-3xl font-bold text-[#1c3a13] mt-1">{stats?.totalUsers ?? 0}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d3fa99]">
              <Users className="h-5 w-5 text-[#1c3a13]" />
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {ROLE_PILLS.map(({ key, label, color }) => (
              <span key={key} className={`rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
                {label}: {stats?.usersByRole?.[key as keyof typeof stats.usersByRole] ?? 0}
              </span>
            ))}
          </div>
        </div>

        {/* Pending Approvals */}
        <Link href="/admin/listings" className="block group">
          <div className={`bg-[#fcfcf7] rounded-2xl border p-5 transition-colors hover:bg-[#eeeee9] ${
            (stats?.pendingListings ?? 0) > 0 ? "border-[#eeeee9]" : "border-[#eeeee9]"
          }`}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs font-medium text-[#1c3a13]/50 uppercase tracking-wide">Pending Approvals</p>
                <p className={`text-3xl font-bold mt-1 ${(stats?.pendingListings ?? 0) > 0 ? "text-[#1c3a13]" : "text-[#1c3a13]"}`}>
                  {stats?.pendingListings ?? 0}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eeeee9]">
                <CheckSquare className="h-5 w-5 text-[#1c3a13]" />
              </div>
            </div>
            <p className="text-xs text-[#1c3a13]/40 flex items-center gap-1">
              Review listings <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
            </p>
          </div>
        </Link>

        {/* Open Complaints */}
        <Link href="/admin/complaints" className="block group">
          <div className={`bg-[#fcfcf7] rounded-2xl border p-5 transition-colors hover:bg-[#eeeee9] ${
            (stats?.openComplaints ?? 0) > 0 ? "border-red-200" : "border-[#eeeee9]"
          }`}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs font-medium text-[#1c3a13]/50 uppercase tracking-wide">Open Complaints</p>
                <p className={`text-3xl font-bold mt-1 ${(stats?.openComplaints ?? 0) > 0 ? "text-red-600" : "text-[#1c3a13]"}`}>
                  {stats?.openComplaints ?? 0}
                </p>
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                (stats?.openComplaints ?? 0) > 0 ? "bg-red-100" : "bg-[#eeeee9]"
              }`}>
                <AlertTriangle className={`h-5 w-5 ${(stats?.openComplaints ?? 0) > 0 ? "text-red-600" : "text-[#1c3a13]"}`} />
              </div>
            </div>
            <p className="text-xs text-[#1c3a13]/40 flex items-center gap-1">
              View complaints <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
            </p>
          </div>
        </Link>

        {/* Total Listings */}
        <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-[#1c3a13]/50 uppercase tracking-wide">Total Listings</p>
              <p className="text-3xl font-bold text-[#1c3a13] mt-1">{stats?.totalListings ?? 0}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eeeee9]">
              <ShoppingBag className="h-5 w-5 text-[#1c3a13]" />
            </div>
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-[#1c3a13]/50 uppercase tracking-wide">Total Orders</p>
              <p className="text-3xl font-bold text-[#1c3a13] mt-1">{stats?.totalOrders ?? 0}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eeeee9]">
              <ClipboardList className="h-5 w-5 text-[#1c3a13]" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-medium text-[#1c3a13] uppercase tracking-wide mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/admin/listings"
            className="flex items-center gap-4 bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] p-5 hover:bg-[#eeeee9] transition-colors group">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#eeeee9] flex-shrink-0">
              <CheckSquare className="h-6 w-6 text-[#1c3a13]" />
            </div>
            <div>
              <p className="font-medium text-[#1c3a13]">Review Pending Listings</p>
              <p className="text-sm text-[#1c3a13]/50">Approve or reject farmer submissions</p>
            </div>
            <ArrowRight className="h-5 w-5 text-[#1c3a13]/40 ml-auto transition-transform group-hover:translate-x-1" />
          </Link>
          <Link href="/admin/complaints"
            className="flex items-center gap-4 bg-[#fcfcf7] rounded-2xl border border-red-200 p-5 hover:bg-[#eeeee9] transition-colors group">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 flex-shrink-0">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="font-medium text-[#1c3a13]">View Open Complaints</p>
              <p className="text-sm text-[#1c3a13]/50">Respond to user-reported incidents</p>
            </div>
            <ArrowRight className="h-5 w-5 text-[#1c3a13]/40 ml-auto transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </div>
  );
}
