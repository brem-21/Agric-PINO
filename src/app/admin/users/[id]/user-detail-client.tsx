"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Shield,
  CheckCircle,
  XCircle,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  Loader2,
  AlertCircle,
  UserCheck,
  UserX,
  ToggleLeft,
  ToggleRight,
  Package,
  ShoppingCart,
  ShoppingBag,
  AlertTriangle,
  ShieldPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

interface UserDetail {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  image: string | null;
  role: string;
  region: string | null;
  district: string | null;
  isVerified: boolean;
  verifiedAt: string | null;
  isActive: boolean;
  ghanaCardNumber: string | null;
  ghanaCardName: string | null;
  residenceLocation: string | null;
  lastSeen: string | null;
  createdAt: string;
  farmerProfile: { farmName: string; location: string; farmSize: number | null; description: string | null; rating: number; totalRatings: number } | null;
  buyerProfile: { businessName: string | null; businessType: string; rating: number; totalRatings: number } | null;
  logisticsProfile: { companyName: string | null; vehicleType: string; licensePlate: string | null; isAvailable: boolean; rating: number; totalRatings: number } | null;
  vendorProfile: { shopName: string; location: string; rating: number; totalRatings: number } | null;
  _count: { listings: number; buyerOrders: number; farmerOrders: number; complaints: number };
}

const ROLE_BADGE: Record<string, string> = {
  FARMER: "bg-[#eeeee9] text-[#1c3a13]",
  BUYER: "bg-[#eeeee9] text-[#1c3a13]",
  LOGISTICS: "bg-[#eeeee9] text-[#1c3a13]",
  VENDOR: "bg-[#eeeee9] text-[#1c3a13]",
  ADMIN: "bg-[#eeeee9] text-[#1c3a13]",
};

export function UserDetailClient({ id }: { id: string }) {
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch(`/api/admin/users/${id}`)
      .then((r) => r.json())
      .then((d) => { setUser(d.data ?? null); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  async function patchUser(payload: Record<string, unknown>, label: string) {
    if (!window.confirm(`Are you sure you want to ${label}?`)) return;
    setActionLoading(label);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setMessage({ type: "error", text: data.error ?? "Failed" }); return; }
      setUser((prev) => prev ? { ...prev, ...data.data } : prev);
      setMessage({ type: "success", text: `User ${label}d successfully.` });
    } catch {
      setMessage({ type: "error", text: "Network error." });
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#1c3a13]/40" /></div>;
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="h-12 w-12 text-[#c4c7c4]" />
        <p className="text-[#1c3a13]/50">User not found.</p>
        <Button asChild variant="outline"><Link href="/admin/users">Back to Users</Link></Button>
      </div>
    );
  }

  const initials = user.name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Back */}
      <Link href="/admin/users" className="flex items-center gap-1.5 text-sm text-[#1c3a13]/50 hover:text-[#1c3a13] w-fit">
        <ArrowLeft className="h-4 w-4" /> Back to Users
      </Link>

      {/* Header card */}
      <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] p-6">
        <div className="flex items-start gap-4">
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.image}
              alt={user.name}
              className="h-16 w-16 rounded-2xl object-cover flex-shrink-0 border border-[#eeeee9]"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#eeeee9] text-xl font-bold text-[#1c3a13] flex-shrink-0">
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl font-light tracking-tight text-[#1c3a13]">{user.name}</h1>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ROLE_BADGE[user.role] ?? "bg-[#eeeee9] text-[#1c3a13]"}`}>
                {user.role}
              </span>
              {user.isVerified
                ? <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-[#d3fa99] text-[#1c3a13]"><CheckCircle className="h-3 w-3" />Verified</span>
                : <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-[#eeeee9] text-[#1c3a13]/50"><XCircle className="h-3 w-3" />Unverified</span>}
              {!user.isActive && <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700">Deactivated</span>}
            </div>
            <p className="text-sm text-[#1c3a13]/40">Joined {formatDate(user.createdAt)}</p>
          </div>
        </div>
      </div>

      {/* Activity counts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Listings", value: user._count.listings, icon: Package },
          { label: "Orders Placed", value: user._count.buyerOrders, icon: ShoppingCart },
          { label: "Orders Received", value: user._count.farmerOrders, icon: ShoppingBag },
          { label: "Complaints", value: user._count.complaints, icon: AlertTriangle },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#eeeee9]">
                <Icon className="h-3.5 w-3.5 text-[#1c3a13]" />
              </div>
              <p className="text-xs font-medium text-[#1c3a13]/50 uppercase tracking-wide">{label}</p>
            </div>
            <p className="text-2xl font-bold text-[#1c3a13]">{value}</p>
          </div>
        ))}
      </div>

      {/* Ghana Card — admin-only sensitive section */}
      <div className="bg-[#eeeee9] rounded-2xl border border-[#eeeee9] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5 text-[#1c3a13]" />
          <h2 className="font-medium text-[#1c3a13]">Ghana Card Details</h2>
          <span className="rounded-full bg-[#1c3a13] text-[#fcfcf7] text-[10px] font-bold px-2 py-0.5 uppercase tracking-wide">Admin Only</span>
        </div>
        <dl className="space-y-2.5 text-sm">
          {[
            { label: "Card Number", value: user.ghanaCardNumber },
            { label: "Name on Card", value: user.ghanaCardName },
            { label: "Residence", value: user.residenceLocation },
          ].map(({ label, value }) => (
            <div key={label} className="flex gap-2">
              <dt className="w-32 text-[#1c3a13]/70 font-medium flex-shrink-0">{label}</dt>
              <dd className="text-[#1c3a13] font-mono">{value ?? <span className="text-[#1c3a13]/40 italic font-sans">Not provided</span>}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Contact */}
        <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] p-5">
          <h2 className="font-medium text-[#1c3a13] mb-4">Contact</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-[#1c3a13]/40 flex-shrink-0" />
              <span className="text-[#1c3a13]">{user.phone}</span>
            </div>
            {user.email && (
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-[#1c3a13]/40 flex-shrink-0" />
                <span className="text-[#1c3a13]">{user.email}</span>
              </div>
            )}
            {user.region && (
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-[#1c3a13]/40 flex-shrink-0" />
                <span className="text-[#1c3a13]">{[user.district, user.region].filter(Boolean).join(", ")}</span>
              </div>
            )}
          </dl>
        </div>

        {/* Activity */}
        <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] p-5">
          <h2 className="font-medium text-[#1c3a13] mb-4">Activity</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-[#1c3a13]/40 flex-shrink-0" />
              <div><span className="text-[#1c3a13]/50 text-xs">Joined</span><p className="text-[#1c3a13]">{formatDate(user.createdAt)}</p></div>
            </div>
            {user.verifiedAt && (
              <div className="flex items-center gap-3">
                <CheckCircle className="h-4 w-4 text-[#1c3a13] flex-shrink-0" />
                <div><span className="text-[#1c3a13]/50 text-xs">Verified</span><p className="text-[#1c3a13]">{formatDate(user.verifiedAt)}</p></div>
              </div>
            )}
            {user.lastSeen && (
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-[#1c3a13]/40 flex-shrink-0" />
                <div><span className="text-[#1c3a13]/50 text-xs">Last seen</span><p className="text-[#1c3a13]">{formatDate(user.lastSeen)}</p></div>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Profile details */}
      {(user.farmerProfile || user.buyerProfile || user.logisticsProfile || user.vendorProfile) && (
        <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] p-5">
          <h2 className="font-medium text-[#1c3a13] mb-4">Profile Details</h2>
          {user.farmerProfile && (
            <dl className="space-y-1.5 text-sm">
              <div><span className="text-[#1c3a13]/50">Farm:</span> <span className="text-[#1c3a13]">{user.farmerProfile.farmName}</span></div>
              <div><span className="text-[#1c3a13]/50">Location:</span> <span className="text-[#1c3a13]">{user.farmerProfile.location}</span></div>
              {user.farmerProfile.farmSize && <div><span className="text-[#1c3a13]/50">Farm size:</span> <span className="text-[#1c3a13]">{user.farmerProfile.farmSize} ha</span></div>}
              <div><span className="text-[#1c3a13]/50">Rating:</span> <span className="text-[#1c3a13]">{user.farmerProfile.rating.toFixed(1)} ({user.farmerProfile.totalRatings} reviews)</span></div>
              {user.farmerProfile.description && <p className="text-[#1c3a13]/70 mt-2">{user.farmerProfile.description}</p>}
            </dl>
          )}
          {user.vendorProfile && (
            <dl className="space-y-1.5 text-sm">
              <div><span className="text-[#1c3a13]/50">Shop:</span> <span className="text-[#1c3a13]">{user.vendorProfile.shopName}</span></div>
              <div><span className="text-[#1c3a13]/50">Location:</span> <span className="text-[#1c3a13]">{user.vendorProfile.location}</span></div>
              <div><span className="text-[#1c3a13]/50">Rating:</span> <span className="text-[#1c3a13]">{user.vendorProfile.rating.toFixed(1)} ({user.vendorProfile.totalRatings} reviews)</span></div>
            </dl>
          )}
          {user.logisticsProfile && (
            <dl className="space-y-1.5 text-sm">
              <div><span className="text-[#1c3a13]/50">Vehicle:</span> <span className="text-[#1c3a13]">{user.logisticsProfile.vehicleType}</span></div>
              {user.logisticsProfile.licensePlate && <div><span className="text-[#1c3a13]/50">Plate:</span> <span className="text-[#1c3a13]">{user.logisticsProfile.licensePlate}</span></div>}
              <div><span className="text-[#1c3a13]/50">Status:</span> <span className={user.logisticsProfile.isAvailable ? "text-[#1c3a13]" : "text-[#1c3a13]/50"}>{user.logisticsProfile.isAvailable ? "Available" : "Unavailable"}</span></div>
            </dl>
          )}
          {user.buyerProfile && (
            <dl className="space-y-1.5 text-sm">
              <div><span className="text-[#1c3a13]/50">Type:</span> <span className="text-[#1c3a13]">{user.buyerProfile.businessType}</span></div>
              {user.buyerProfile.businessName && <div><span className="text-[#1c3a13]/50">Business:</span> <span className="text-[#1c3a13]">{user.buyerProfile.businessName}</span></div>}
            </dl>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] p-5">
        <h2 className="font-medium text-[#1c3a13] mb-4">Admin Actions</h2>
        {message && (
          <div className={`mb-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${message.type === "success" ? "bg-[#d3fa99] border border-[#d3fa99] text-[#1c3a13]" : "bg-red-50 border border-red-200 text-red-700"}`}>
            {message.type === "success" ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {message.text}
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => patchUser({ isVerified: !user.isVerified }, user.isVerified ? "unverify" : "verify")}
            disabled={!!actionLoading}
            className={user.isVerified
              ? "rounded-full border border-[#eeeee9] text-[#1c3a13] hover:bg-[#eeeee9] bg-transparent"
              : "rounded-full bg-[#1c3a13] hover:bg-[#2a5219] text-[#fcfcf7]"}
            variant={user.isVerified ? "outline" : "default"}
          >
            {actionLoading === (user.isVerified ? "unverify" : "verify")
              ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
              : user.isVerified ? <UserX className="h-4 w-4 mr-2" /> : <UserCheck className="h-4 w-4 mr-2" />}
            {user.isVerified ? "Unverify User" : "Verify User"}
          </Button>
          <Button
            onClick={() => patchUser({ isActive: !user.isActive }, user.isActive ? "deactivate" : "activate")}
            disabled={!!actionLoading}
            variant="outline"
            className={user.isActive
              ? "rounded-full border-red-600 text-red-600 hover:bg-red-50"
              : "rounded-full border-[#1c3a13] text-[#1c3a13] hover:bg-[#eeeee9]"}
          >
            {actionLoading === (user.isActive ? "deactivate" : "activate")
              ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
              : user.isActive ? <ToggleLeft className="h-4 w-4 mr-2" /> : <ToggleRight className="h-4 w-4 mr-2" />}
            {user.isActive ? "Deactivate Account" : "Activate Account"}
          </Button>
          {user.role !== "ADMIN" && (
            <Button
              onClick={() => patchUser({ role: "ADMIN" }, "promote to admin")}
              disabled={!!actionLoading}
              variant="outline"
              className="rounded-full border-[#1c3a13] text-[#1c3a13] hover:bg-[#eeeee9]"
            >
              {actionLoading === "promote to admin"
                ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                : <ShieldPlus className="h-4 w-4 mr-2" />}
              Promote to Admin
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
