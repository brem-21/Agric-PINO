"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Phone, MapPin, Star, TrendingDown, PlusCircle, AlertCircle, CheckCircle, Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, formatDate, formatPercent, PRODUCE_CATEGORIES, COMMON_CROPS, UNITS } from "@/lib/utils";
import { lossColorClass } from "@/lib/post-harvest-loss";

const LISTING_STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-[#d3fa99] text-[#1c3a13]",
  SOLD: "bg-[#eeeee9] text-[#1c3a13]",
  EXPIRED: "bg-red-100 text-red-700",
  DRAFT: "bg-[#eeeee9] text-[#1c3a13]",
};

interface Detail {
  farmer: {
    id: string; name: string; phone: string; region: string | null; district: string | null;
    farmerProfile: { farmName: string; farmSize: number | null; location: string; rating: number; totalRatings: number; description: string | null } | null;
  };
  listings: { id: string; cropType: string; status: string; quantity: number; unit: string; pricePerUnit: number; createdAt: string; approvalStatus: string }[];
  bookings: { id: string; cropType: string; quantity: number; unit: string; status: string; scheduledDropoff: string }[];
  inStockValue: number;
  lossPercentageThisMonth: number | null;
  lossPercentageAllTime: number | null;
}

interface FormState {
  cropType: string;
  category: string;
  quantity: string;
  unit: string;
  pricePerUnit: string;
  expiryDate: string;
}

const EMPTY_FORM: FormState = { cropType: "", category: "", quantity: "", unit: "", pricePerUnit: "", expiryDate: "" };

export default function StorageCustomerDetailPage() {
  const { farmerId } = useParams<{ farmerId: string }>();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [tip, setTip] = useState<string | null>(null);
  const [tipLoading, setTipLoading] = useState(false);

  const loadTip = useCallback(async () => {
    setTipLoading(true);
    try {
      const res = await fetch(`/api/storage/customers/${farmerId}/ai-tip${tip ? "?force=true" : ""}`);
      if (res.ok) setTip((await res.json()).content);
    } finally {
      setTipLoading(false);
    }
  }, [farmerId, tip]);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/storage/customers/${farmerId}`);
    const data = await res.json();
    setDetail(res.ok ? data : null);
    setLoading(false);
  }, [farmerId]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  function update(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const quantity = parseFloat(form.quantity);
    const pricePerUnit = parseFloat(form.pricePerUnit);
    if (!form.category) { setError("Please select a category."); return; }
    if (!form.unit) { setError("Please select a unit."); return; }
    if (isNaN(quantity) || quantity <= 0) { setError("Please enter a valid quantity."); return; }
    if (isNaN(pricePerUnit) || pricePerUnit <= 0) { setError("Please enter a valid price."); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/storage/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmerId,
          cropType: form.cropType.trim(),
          category: form.category,
          quantity,
          unit: form.unit,
          pricePerUnit,
          expiryDate: form.expiryDate || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to create listing."); return; }
      setSuccess(true);
      setForm(EMPTY_FORM);
      setShowForm(false);
      fetchDetail();
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-[#1c3a13]/40" /></div>;
  }

  if (!detail) {
    return (
      <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] py-20 text-center">
        <p className="text-[#1c3a13]/50">This farmer isn&apos;t a customer of your facility.</p>
        <Link href="/storage/customers" className="text-sm text-[#1c3a13] hover:underline mt-2 inline-block">Back to customers</Link>
      </div>
    );
  }

  const { farmer } = detail;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="rounded-full text-[#1c3a13] hover:bg-[#eeeee9]">
          <Link href="/storage/customers"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-light tracking-tight text-[#1c3a13]">{farmer.name}</h1>
          <p className="text-[#1c3a13]/50 text-sm">{farmer.farmerProfile?.farmName ?? "Customer"}</p>
        </div>
      </div>

      {/* Farmer details */}
      <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] p-6 space-y-3">
        <div className="flex items-center gap-3 text-sm">
          <Phone className="h-4 w-4 text-[#1c3a13]/40" />
          <span className="text-[#1c3a13]">{farmer.phone}</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <MapPin className="h-4 w-4 text-[#1c3a13]/40" />
          <span className="text-[#1c3a13]">{farmer.farmerProfile?.location || [farmer.district, farmer.region].filter(Boolean).join(", ") || "—"}</span>
        </div>
        {farmer.farmerProfile && (
          <div className="flex items-center gap-3 text-sm">
            <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
            <span className="text-[#1c3a13]">{farmer.farmerProfile.rating.toFixed(1)} ({farmer.farmerProfile.totalRatings} ratings)</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] p-5">
          <p className="text-2xl font-bold text-[#1c3a13]">{formatCurrency(detail.inStockValue)}</p>
          <p className="text-sm text-[#1c3a13]/50 mt-0.5">In-Stock Value</p>
        </div>
        <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] p-5">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-lg font-bold ${lossColorClass(detail.lossPercentageThisMonth)}`}>
            <TrendingDown className="h-4 w-4" />
            {detail.lossPercentageThisMonth === null ? "—" : formatPercent(detail.lossPercentageThisMonth)}
          </span>
          <p className="text-sm text-[#1c3a13]/50 mt-1.5">Post-Harvest Loss (this month)</p>
        </div>
      </div>

      {/* AI loss-reduction tip */}
      <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#eeeee9]">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#d3fa99]">
              <Sparkles className="h-4 w-4 text-[#1c3a13]" />
            </div>
            <h2 className="font-medium text-[#1c3a13]">AI Loss-Reduction Tip</h2>
          </div>
          <Button size="sm" variant="outline" disabled={tipLoading} onClick={loadTip} className="rounded-full border-[#eeeee9] text-[#1c3a13] hover:bg-[#eeeee9]">
            {tipLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
            {tip ? "Regenerate" : "Generate"}
          </Button>
        </div>
        {tip && <p className="px-6 py-4 text-sm text-[#1c3a13] whitespace-pre-wrap">{tip}</p>}
      </div>

      {/* Create listing */}
      <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#eeeee9]">
          <h2 className="font-medium text-[#1c3a13]">Create Listing on Their Behalf</h2>
          <Button size="sm" variant="outline" className="rounded-full border-[#1c3a13] text-[#1c3a13] hover:bg-[#eeeee9]" onClick={() => setShowForm((s) => !s)}>
            <PlusCircle className="h-4 w-4 mr-1.5" /> {showForm ? "Cancel" : "New Listing"}
          </Button>
        </div>
        {success && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg bg-[#d3fa99] px-4 py-2.5 text-sm text-[#1c3a13]">
            <CheckCircle className="h-4 w-4" /> Listing submitted for admin approval.
          </div>
        )}
        {showForm && (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 flex-shrink-0" /><span>{error}</span>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="cropType" className="text-[#1c3a13]">Crop Type *</Label>
              <Input id="cropType" list="crop-suggestions" placeholder="e.g. Tomatoes" value={form.cropType}
                onChange={(e) => update("cropType", e.target.value)} required
                className="bg-[#fcfcf7] border-[#eeeee9] text-[#1c3a13] rounded-lg focus:ring-[#1c3a13] focus:border-[#1c3a13]" />
              <datalist id="crop-suggestions">
                {COMMON_CROPS.map((crop) => <option key={crop} value={crop} />)}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category" className="text-[#1c3a13]">Category *</Label>
              <Select value={form.category} onValueChange={(v) => update("category", v)}>
                <SelectTrigger id="category" className="bg-[#fcfcf7] border-[#eeeee9] text-[#1c3a13] rounded-lg focus:ring-[#1c3a13]">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent className="bg-[#fcfcf7] border-[#eeeee9]">
                  {PRODUCE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value} className="text-[#1c3a13] focus:bg-[#eeeee9]">{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity" className="text-[#1c3a13]">Quantity *</Label>
                <Input id="quantity" type="number" min="0.01" step="0.01" value={form.quantity}
                  onChange={(e) => update("quantity", e.target.value)} required
                  className="bg-[#fcfcf7] border-[#eeeee9] text-[#1c3a13] rounded-lg focus:ring-[#1c3a13] focus:border-[#1c3a13]" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit" className="text-[#1c3a13]">Unit *</Label>
                <Select value={form.unit} onValueChange={(v) => update("unit", v)}>
                  <SelectTrigger id="unit" className="bg-[#fcfcf7] border-[#eeeee9] text-[#1c3a13] rounded-lg focus:ring-[#1c3a13]">
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#fcfcf7] border-[#eeeee9]">
                    {UNITS.map((u) => <SelectItem key={u} value={u} className="text-[#1c3a13] focus:bg-[#eeeee9]">{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pricePerUnit" className="text-[#1c3a13]">Price per Unit (GHS) *</Label>
              <Input id="pricePerUnit" type="number" min="0.01" step="0.01" value={form.pricePerUnit}
                onChange={(e) => update("pricePerUnit", e.target.value)} required
                className="bg-[#fcfcf7] border-[#eeeee9] text-[#1c3a13] rounded-lg focus:ring-[#1c3a13] focus:border-[#1c3a13]" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiryDate" className="text-[#1c3a13]">Expiry Date</Label>
              <Input id="expiryDate" type="date" value={form.expiryDate}
                onChange={(e) => update("expiryDate", e.target.value)}
                className="bg-[#fcfcf7] border-[#eeeee9] text-[#1c3a13] rounded-lg focus:ring-[#1c3a13] focus:border-[#1c3a13]" />
            </div>
            <Button type="submit" disabled={submitting} className="w-full rounded-full bg-[#1c3a13] text-[#fcfcf7] hover:bg-[#2a5219]">
              {submitting ? "Submitting…" : "Submit for Approval"}
            </Button>
          </form>
        )}
      </div>

      {/* Listings history */}
      <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#eeeee9]">
          <h2 className="font-medium text-[#1c3a13]">Listings at Your Facility</h2>
        </div>
        {detail.listings.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-[#1c3a13]/50">No listings yet.</p>
        ) : (
          <div className="divide-y divide-[#eeeee9]">
            {detail.listings.map((l) => (
              <div key={l.id} className="px-6 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-[#1c3a13] truncate">{l.cropType}</p>
                  <p className="text-xs text-[#1c3a13]/50">{formatDate(l.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${LISTING_STATUS_STYLES[l.status] ?? "bg-[#eeeee9] text-[#1c3a13]"}`}>{l.status}</span>
                  {l.approvalStatus !== "APPROVED" && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">
                      {l.approvalStatus === "PENDING" ? "Pending" : "Rejected"}
                    </span>
                  )}
                  <span className="text-sm text-[#1c3a13]/70">{l.quantity} {l.unit}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bookings history */}
      <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#eeeee9]">
          <h2 className="font-medium text-[#1c3a13]">Drop-off Bookings</h2>
        </div>
        {detail.bookings.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-[#1c3a13]/50">No bookings yet.</p>
        ) : (
          <div className="divide-y divide-[#eeeee9]">
            {detail.bookings.map((b) => (
              <div key={b.id} className="px-6 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-[#1c3a13] truncate">{b.cropType}</p>
                  <p className="text-xs text-[#1c3a13]/50">Scheduled {formatDate(b.scheduledDropoff)}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-[#eeeee9] text-[#1c3a13]">{b.status.replace(/_/g, " ")}</span>
                  <span className="text-sm text-[#1c3a13]/70">{b.quantity} {b.unit}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
