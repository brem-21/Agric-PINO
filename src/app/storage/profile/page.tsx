"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LocationPicker } from "@/components/shared/location-picker";
import { Loader2, LocateFixed, Map, CheckCircle, AlertCircle } from "lucide-react";
import { PRODUCE_CATEGORIES } from "@/lib/utils";

const STORAGE_TYPES = [
  { value: "COLD_CHAIN", label: "Cold Chain (refrigerated)", hint: "Best for tomatoes, mangoes, watermelons, leafy vegetables" },
  { value: "HERMETIC_DRY", label: "Hermetic / Dry Storage (PICS-bag style)", hint: "Best for maize, sorghum, millet, rice, cowpea, soybean, groundnut" },
];

interface Facility {
  name: string;
  description: string | null;
  location: string;
  latitude: number | null;
  longitude: number | null;
  storageTypes: string[];
  capacityTonnes: number | null;
  acceptedCategories: string[];
  operatingHours: string | null;
  approvalStatus: string;
}

export default function StorageProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [locating, setLocating] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [storageTypes, setStorageTypes] = useState<string[]>([]);
  const [capacityTonnes, setCapacityTonnes] = useState("");
  const [acceptedCategories, setAcceptedCategories] = useState<string[]>([]);
  const [operatingHours, setOperatingHours] = useState("");

  useEffect(() => {
    fetch("/api/storage/profile")
      .then((r) => r.json())
      .then((d: { facility: Facility | null }) => {
        const f = d.facility;
        if (f) {
          setName(f.name);
          setDescription(f.description ?? "");
          setLocation(f.location);
          setLat(f.latitude);
          setLng(f.longitude);
          setStorageTypes(f.storageTypes);
          setCapacityTonnes(f.capacityTonnes?.toString() ?? "");
          setAcceptedCategories(f.acceptedCategories);
          setOperatingHours(f.operatingHours ?? "");
          setApprovalStatus(f.approvalStatus);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  function toggle(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  function useGPS() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setLat(latitude);
        setLng(longitude);
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
          const data = await res.json();
          setLocation(data.address?.town ?? data.address?.city ?? data.address?.village ?? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        } catch {
          setLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        }
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 8000 }
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess(false);

    const res = await fetch("/api/storage/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description: description || undefined,
        location,
        latitude: lat ?? undefined,
        longitude: lng ?? undefined,
        storageTypes,
        capacityTonnes: capacityTonnes ? parseFloat(capacityTonnes) : undefined,
        acceptedCategories,
        operatingHours: operatingHours || undefined,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      setApprovalStatus(data.facility.approvalStatus);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to save");
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-[#1c3a13]" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-light tracking-tight text-[#1c3a13]">Facility Profile</h1>
        <p className="text-[#1c3a13]/50 text-sm mt-1">
          This is what farmers see on the map when booking a drop-off.
        </p>
      </div>

      {approvalStatus && approvalStatus !== "APPROVED" && (
        <div className={`rounded-2xl border p-4 text-sm ${approvalStatus === "REJECTED" ? "bg-red-50 border-red-200 text-red-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
          {approvalStatus === "REJECTED"
            ? "This facility was not approved. Update your details and resubmit for review."
            : "Awaiting admin approval — your facility won't appear on the farmer map until it's approved."}
        </div>
      )}

      <Card className="bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-[#1c3a13]">Facility Details</CardTitle>
          <CardDescription className="text-[#1c3a13]/50">Storage type, capacity, and accepted crops</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 rounded-lg bg-[#d3fa99] border border-[#1c3a13]/10 p-3 text-sm text-[#1c3a13]">
                <CheckCircle className="h-4 w-4 flex-shrink-0" />
                Saved.
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-[#1c3a13]">Facility Name *</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required
                className="bg-[#fcfcf7] border-[#eeeee9] text-[#1c3a13] rounded-lg" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-[#1c3a13]">Description</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)}
                className="bg-[#fcfcf7] border-[#eeeee9] text-[#1c3a13] rounded-lg" rows={3} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location" className="text-[#1c3a13]">Location *</Label>
              <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} required
                placeholder="e.g. Bolgatanga, Upper East Region"
                className="bg-[#fcfcf7] border-[#eeeee9] text-[#1c3a13] rounded-lg" />
              <div className="flex gap-2">
                <button type="button" onClick={useGPS} disabled={locating}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#eeeee9] bg-[#fcfcf7] px-3 py-1.5 text-xs font-medium text-[#1c3a13]/70 hover:border-[#1c3a13] hover:text-[#1c3a13] disabled:opacity-50">
                  {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LocateFixed className="h-3.5 w-3.5" />}
                  Use my location
                </button>
                <button type="button" onClick={() => setShowMap((v) => !v)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${showMap ? "border-[#1c3a13] bg-[#eeeee9] text-[#1c3a13]" : "border-[#eeeee9] bg-[#fcfcf7] text-[#1c3a13]/70 hover:border-[#1c3a13] hover:text-[#1c3a13]"}`}>
                  <Map className="h-3.5 w-3.5" />
                  {showMap ? "Close map" : "Pick on map"}
                </button>
              </div>
              {showMap && (
                <LocationPicker
                  defaultLat={lat ?? undefined}
                  defaultLng={lng ?? undefined}
                  onSelect={(pickedLat, pickedLng, label) => {
                    setLat(pickedLat); setLng(pickedLng);
                    setLocation(label);
                    setShowMap(false);
                  }}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-[#1c3a13]">Storage Type *</Label>
              <div className="space-y-2">
                {STORAGE_TYPES.map((t) => (
                  <label key={t.value} className="flex items-start gap-2.5 cursor-pointer rounded-xl border border-[#eeeee9] p-3">
                    <input type="checkbox" checked={storageTypes.includes(t.value)}
                      onChange={() => toggle(storageTypes, setStorageTypes, t.value)}
                      className="h-4 w-4 mt-0.5 rounded border-[#eeeee9] text-[#1c3a13]" />
                    <span>
                      <span className="block text-sm font-medium text-[#1c3a13]">{t.label}</span>
                      <span className="block text-xs text-[#1c3a13]/50">{t.hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="capacity" className="text-[#1c3a13]">Capacity (tonnes, advisory)</Label>
              <Input id="capacity" type="number" min={0} step={0.5} value={capacityTonnes}
                onChange={(e) => setCapacityTonnes(e.target.value)}
                className="bg-[#fcfcf7] border-[#eeeee9] text-[#1c3a13] rounded-lg" />
            </div>

            <div className="space-y-2">
              <Label className="text-[#1c3a13]">Accepted Produce Categories *</Label>
              <div className="flex flex-wrap gap-2">
                {PRODUCE_CATEGORIES.map((cat) => (
                  <label key={cat.value} className="flex items-center gap-1.5 cursor-pointer rounded-full border border-[#eeeee9] px-3 py-1.5">
                    <input type="checkbox" checked={acceptedCategories.includes(cat.value)}
                      onChange={() => toggle(acceptedCategories, setAcceptedCategories, cat.value)}
                      className="h-3.5 w-3.5 rounded border-[#eeeee9] text-[#1c3a13]" />
                    <span className="text-xs text-[#1c3a13]">{cat.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="hours" className="text-[#1c3a13]">Operating Hours</Label>
              <Input id="hours" value={operatingHours} onChange={(e) => setOperatingHours(e.target.value)}
                placeholder="e.g. Mon–Sat 7am–6pm"
                className="bg-[#fcfcf7] border-[#eeeee9] text-[#1c3a13] rounded-lg" />
            </div>

            <Button type="submit" disabled={saving || storageTypes.length === 0 || acceptedCategories.length === 0}
              className="w-full rounded-full bg-[#1c3a13] text-[#fcfcf7] hover:bg-[#2a5219]">
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : "Save Facility Profile"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
