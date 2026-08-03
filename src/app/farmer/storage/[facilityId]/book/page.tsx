"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, AlertCircle, CheckCircle, ArrowLeft } from "lucide-react";
import { PRODUCE_CATEGORIES, COMMON_CROPS, UNITS } from "@/lib/utils";

interface Facility {
  id: string;
  name: string;
  location: string;
  storageTypes: string[];
  acceptedCategories: string[];
}

export default function BookStorageDropoffPage({ params }: { params: Promise<{ facilityId: string }> }) {
  const { facilityId } = use(params);
  const router = useRouter();

  const [facility, setFacility] = useState<Facility | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [cropType, setCropType] = useState("");
  const [category, setCategory] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("kg");
  const [pricePerUnit, setPricePerUnit] = useState("");
  const [scheduledDropoff, setScheduledDropoff] = useState("");

  useEffect(() => {
    fetch(`/api/storage/facilities/${facilityId}`)
      .then((r) => r.json())
      .then((d) => setFacility(d.facility ?? null))
      .finally(() => setLoading(false));
  }, [facilityId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!category) {
      setError("Select a category");
      return;
    }
    setSubmitting(true);
    setError("");

    const res = await fetch("/api/storage/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        facilityId,
        cropType,
        category,
        quantity: parseFloat(quantity),
        unit,
        pricePerUnit: parseFloat(pricePerUnit),
        scheduledDropoff,
      }),
    });

    if (res.ok) {
      setSuccess(true);
      setTimeout(() => router.push("/farmer/storage/bookings"), 1500);
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to submit booking");
    }
    setSubmitting(false);
  }

  if (loading) {
    return <div className="flex justify-center py-24"><Loader2 className="h-7 w-7 animate-spin text-[#1c3a13]/40" /></div>;
  }

  if (!facility) {
    return (
      <div className="text-center py-20">
        <p className="text-[#1c3a13]/50">Facility not found.</p>
        <Button asChild variant="outline" className="mt-4 rounded-full border-[#eeeee9] text-[#1c3a13]">
          <Link href="/farmer/storage"><ArrowLeft className="h-4 w-4 mr-2" />Back to facilities</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <Link href="/farmer/storage" className="inline-flex items-center gap-1.5 text-sm text-[#1c3a13]/60 hover:text-[#1c3a13]">
        <ArrowLeft className="h-3.5 w-3.5" />Back to facilities
      </Link>

      <Card className="bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-[#1c3a13]">Book a Drop-off at {facility.name}</CardTitle>
          <CardDescription className="text-[#1c3a13]/50">{facility.location}</CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="flex items-center gap-2 rounded-lg bg-[#d3fa99] border border-[#1c3a13]/10 p-4 text-sm text-[#1c3a13]">
              <CheckCircle className="h-4 w-4 flex-shrink-0" />
              Booking submitted — the facility will confirm your drop-off slot.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="crop" className="text-[#1c3a13]">Crop *</Label>
                <Input id="crop" list="crop-options" value={cropType} onChange={(e) => setCropType(e.target.value)} required
                  placeholder="e.g. Tomatoes" className="bg-[#fcfcf7] border-[#eeeee9] text-[#1c3a13] rounded-lg" />
                <datalist id="crop-options">
                  {COMMON_CROPS.map((c) => <option key={c} value={c} />)}
                </datalist>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[#1c3a13]">Category *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="bg-[#fcfcf7] border-[#eeeee9] focus:ring-[#1c3a13]">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="quantity" className="text-[#1c3a13]">Quantity *</Label>
                  <Input id="quantity" type="number" min={0} step={0.1} value={quantity}
                    onChange={(e) => setQuantity(e.target.value)} required
                    className="bg-[#fcfcf7] border-[#eeeee9] text-[#1c3a13] rounded-lg" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[#1c3a13]">Unit *</Label>
                  <Select value={unit} onValueChange={setUnit}>
                    <SelectTrigger className="bg-[#fcfcf7] border-[#eeeee9] focus:ring-[#1c3a13]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="price" className="text-[#1c3a13]">Your Asking Price (GHS/unit) *</Label>
                <Input id="price" type="number" min={0} step={0.01} value={pricePerUnit}
                  onChange={(e) => setPricePerUnit(e.target.value)} required
                  className="bg-[#fcfcf7] border-[#eeeee9] text-[#1c3a13] rounded-lg" />
                <p className="text-xs text-[#1c3a13]/40">
                  Used to auto-list your produce once dropped off. The facility keeps 5%, you keep 95% of any sale.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dropoff" className="text-[#1c3a13]">Scheduled Drop-off *</Label>
                <Input id="dropoff" type="datetime-local" value={scheduledDropoff}
                  onChange={(e) => setScheduledDropoff(e.target.value)} required
                  className="bg-[#fcfcf7] border-[#eeeee9] text-[#1c3a13] rounded-lg" />
              </div>

              <Button type="submit" disabled={submitting} className="w-full rounded-full bg-[#1c3a13] text-[#fcfcf7] hover:bg-[#2a5219]">
                {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting…</> : "Submit Booking Request"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
