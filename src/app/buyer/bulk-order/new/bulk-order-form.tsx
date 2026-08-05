"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Search, Loader2, MapPin, AlertCircle, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { COMMON_CROPS, formatCurrency } from "@/lib/utils";

interface Listing {
  id: string;
  cropType: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  location: string;
  farmer: { id: string; name: string; farmerProfile: { farmName: string | null } | null };
}

export function BulkOrderForm() {
  const router = useRouter();
  const [cropType, setCropType] = useState("");
  const [searching, setSearching] = useState(false);
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [fulfillmentType, setFulfillmentType] = useState<"DELIVERY" | "PICKUP">("DELIVERY");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function search() {
    if (!cropType.trim()) return;
    setSearching(true);
    setError("");
    setListings(null);
    setSelected({});
    try {
      const res = await fetch(`/api/listings?cropType=${encodeURIComponent(cropType.trim())}&limit=50`);
      const data = await res.json();
      setListings(data.listings ?? []);
    } finally {
      setSearching(false);
    }
  }

  function toggle(listing: Listing, checked: boolean) {
    setSelected((prev) => {
      const next = { ...prev };
      if (checked) next[listing.id] = Math.min(1, listing.quantity);
      else delete next[listing.id];
      return next;
    });
  }

  function setQty(listing: Listing, qty: number) {
    setSelected((prev) => ({ ...prev, [listing.id]: Math.max(1, Math.min(listing.quantity, qty)) }));
  }

  const selectedListings = (listings ?? []).filter((l) => l.id in selected);
  const totalQuantity = selectedListings.reduce((sum, l) => sum + (selected[l.id] ?? 0), 0);
  const totalAmount = selectedListings.reduce((sum, l) => sum + (selected[l.id] ?? 0) * l.pricePerUnit, 0);
  const farmerCount = new Set(selectedListings.map((l) => l.farmer.id)).size;

  async function handleSubmit() {
    setError("");
    if (selectedListings.length === 0) { setError("Select at least one listing."); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/bulk-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cropType: cropType.trim(),
          fulfillmentType,
          notes: notes.trim() || undefined,
          items: selectedListings.map((l) => ({ listingId: l.id, quantity: selected[l.id] })),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to create bulk order"); return; }
      router.push("/buyer/bulk-orders");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="rounded-full text-[#1c3a13] hover:bg-[#eeeee9]">
          <Link href="/buyer/bulk-orders"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-light tracking-tight text-[#1c3a13]">New Bulk Order</h1>
          <p className="text-[#1c3a13]/50 text-sm mt-1">Pull one crop's stock from as many farmers as it takes to fill your quantity.</p>
        </div>
      </div>

      <Card className="bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-[#1c3a13]">1. Pick a crop</CardTitle>
          <CardDescription className="text-[#1c3a13]/50">We&apos;ll show every active listing for it, across all farmers.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              list="crops"
              value={cropType}
              onChange={(e) => setCropType(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="e.g. Tomatoes"
              className="bg-[#fcfcf7] border-[#eeeee9] text-[#1c3a13] rounded-lg"
            />
            <datalist id="crops">
              {COMMON_CROPS.map((c) => <option key={c} value={c} />)}
            </datalist>
            <Button onClick={search} disabled={searching || !cropType.trim()} className="rounded-full bg-[#1c3a13] hover:bg-[#2a5219] text-[#fcfcf7] flex-shrink-0">
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {listings !== null && (
        <Card className="bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg font-medium text-[#1c3a13]">2. Select listings</CardTitle>
            <CardDescription className="text-[#1c3a13]/50">
              {listings.length === 0 ? "No active listings found for this crop." : `${listings.length} listing(s) available`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {listings.map((l) => {
              const checked = l.id in selected;
              return (
                <div key={l.id} className={`flex items-center gap-3 rounded-xl border p-3 ${checked ? "border-[#1c3a13] bg-[#eeeee9]" : "border-[#eeeee9]"}`}>
                  <input type="checkbox" checked={checked} onChange={(e) => toggle(l, e.target.checked)}
                    className="h-4 w-4 rounded text-[#1c3a13] border-[#eeeee9] flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[#1c3a13] text-sm">{l.farmer.farmerProfile?.farmName ?? l.farmer.name}</p>
                    <p className="text-xs text-[#1c3a13]/50 flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {l.location} · {formatCurrency(l.pricePerUnit)}/{l.unit} · {l.quantity} {l.unit} available
                    </p>
                  </div>
                  {checked && (
                    <Input
                      type="number"
                      min={1}
                      max={l.quantity}
                      value={selected[l.id]}
                      onChange={(e) => setQty(l, parseFloat(e.target.value) || 1)}
                      className="w-24 h-9 text-center bg-[#fcfcf7] border-[#eeeee9] text-[#1c3a13] rounded-lg flex-shrink-0"
                    />
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {selectedListings.length > 0 && (
        <Card className="bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg font-medium text-[#1c3a13]">3. Review & submit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl bg-[#eeeee9] p-4 grid grid-cols-3 gap-3 text-center">
              <div><p className="text-xl font-bold text-[#1c3a13]">{farmerCount}</p><p className="text-xs text-[#1c3a13]/50">Farmer(s)</p></div>
              <div><p className="text-xl font-bold text-[#1c3a13]">{totalQuantity.toLocaleString()}</p><p className="text-xs text-[#1c3a13]/50">Total quantity</p></div>
              <div><p className="text-xl font-bold text-[#1c3a13]">{formatCurrency(totalAmount)}</p><p className="text-xs text-[#1c3a13]/50">Total value</p></div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[#1c3a13] text-sm">Fulfillment</Label>
              <div className="flex gap-2">
                {(["DELIVERY", "PICKUP"] as const).map((f) => (
                  <button key={f} type="button" onClick={() => setFulfillmentType(f)}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium border transition-colors ${
                      fulfillmentType === f ? "border-[#1c3a13] bg-[#1c3a13] text-[#fcfcf7]" : "border-[#eeeee9] text-[#1c3a13]/70"
                    }`}>
                    {f === "DELIVERY" ? "Delivery" : "Pickup"}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[#1c3a13] text-sm">Notes (optional)</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Delivery instructions, grading requirements…"
                className="bg-[#fcfcf7] border-[#eeeee9] text-[#1c3a13] rounded-lg" />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-100 px-3 py-2.5 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
              </div>
            )}

            <Button onClick={handleSubmit} disabled={submitting} className="w-full h-11 rounded-full bg-[#1c3a13] hover:bg-[#2a5219] text-[#fcfcf7]">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShoppingCart className="h-4 w-4 mr-2" />}
              Create Bulk Order — {formatCurrency(totalAmount)}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
