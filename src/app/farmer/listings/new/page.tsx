"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ArrowLeft, AlertCircle, CheckCircle, Upload, X, ImageIcon, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PRODUCE_CATEGORIES, COMMON_CROPS, UNITS } from "@/lib/utils";

interface FormState {
  cropType: string;
  category: string;
  quantity: string;
  unit: string;
  pricePerUnit: string;
  description: string;
  harvestDate: string;
  expiryDate: string;
  location: string;
  status: "ACTIVE" | "DRAFT";
}

export default function NewListingPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const isVerified = !!session?.user?.isVerified;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [autoApproved, setAutoApproved] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const [form, setForm] = useState<FormState>({
    cropType: "",
    category: "",
    quantity: "",
    unit: "",
    pricePerUnit: "",
    description: "",
    harvestDate: "",
    expiryDate: "",
    location: "",
    status: "ACTIVE",
  });

  function update(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const remaining = 5 - images.length;
    if (remaining <= 0) {
      setUploadError("Maximum 5 images allowed.");
      return;
    }
    const toUpload = files.slice(0, remaining);

    setUploading(true);
    setUploadError("");

    const uploaded: string[] = [];
    for (const file of toUpload) {
      const fd = new FormData();
      fd.append("file", file);
      try {
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (res.ok) {
          uploaded.push(data.url as string);
        } else {
          setUploadError(data.error ?? "Upload failed");
        }
      } catch {
        setUploadError("Upload failed. Please try again.");
      }
    }

    setImages((prev) => [...prev, ...uploaded]);
    setUploading(false);
    // Reset file input so the same file can be re-selected if needed
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeImage(url: string) {
    setImages((prev) => prev.filter((u) => u !== url));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.category) { setError("Please select a category."); return; }
    if (!form.unit) { setError("Please select a unit."); return; }

    const quantity = parseFloat(form.quantity);
    const pricePerUnit = parseFloat(form.pricePerUnit);

    if (isNaN(quantity) || quantity <= 0) { setError("Please enter a valid quantity."); return; }
    if (quantity > 1_000_000) { setError("Quantity seems unrealistically high."); return; }
    if (isNaN(pricePerUnit) || pricePerUnit <= 0) { setError("Please enter a valid price."); return; }
    if (pricePerUnit > 100_000) { setError("Price per unit seems unrealistically high."); return; }

    setLoading(true);

    try {
      const payload: Record<string, unknown> = {
        cropType: form.cropType.trim(),
        category: form.category,
        quantity,
        unit: form.unit,
        pricePerUnit,
        description: form.description.trim() || undefined,
        harvestDate: form.harvestDate || undefined,
        expiryDate: form.expiryDate || undefined,
        location: form.location.trim() || "Northern Region",
        status: form.status,
        images,
      };

      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create listing.");
        return;
      }

      setAutoApproved(!!data.autoApproved);
      setSuccess(true);
      setTimeout(() => router.push("/farmer/listings"), 1500);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#d3fa99]">
          <CheckCircle className="h-10 w-10 text-[#1c3a13]" />
        </div>
        <h2 className="text-xl font-light tracking-tight text-[#1c3a13]">Listing created!</h2>
        <p className="text-[#1c3a13]/50 text-sm">
          {autoApproved
            ? "It's live on the marketplace now — no waiting."
            : "It needs a quick admin review before it's visible to buyers."}
        </p>
        <p className="text-[#1c3a13]/40 text-xs">Redirecting to your listings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="rounded-full text-[#1c3a13] hover:bg-[#eeeee9]">
          <Link href="/farmer/listings">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-light tracking-tight text-[#1c3a13]">New Listing</h1>
          <p className="text-[#1c3a13]/50 text-sm">List your produce on the marketplace</p>
        </div>
      </div>

      <Card className="bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl">
        <CardHeader>
          <CardTitle className="font-medium text-[#1c3a13]">Produce Details</CardTitle>
          <CardDescription className="text-[#1c3a13]/50">Fill in the details about the produce you want to sell</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {!isVerified && (
              <div className="flex items-start gap-3 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                <ShieldAlert className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div>
                  Verify your account before creating listings.{" "}
                  <Link href="/verification" className="font-medium underline hover:no-underline">
                    Apply for verification
                  </Link>
                </div>
              </div>
            )}
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Product Images */}
            <div className="space-y-2">
              <Label className="text-[#1c3a13]">Product Photos</Label>
              <div className="space-y-3">
                {/* Image previews */}
                {images.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {images.map((url) => (
                      <div key={url} className="relative group aspect-square">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt="Product"
                          className="w-full h-full object-cover rounded-lg border border-[#eeeee9]"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(url)}
                          className="absolute top-1 right-1 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {images.length < 5 && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="aspect-square rounded-lg border-2 border-dashed border-[#eeeee9] flex flex-col items-center justify-center text-[#1c3a13]/40 hover:border-[#1c3a13] hover:text-[#1c3a13] transition-colors"
                      >
                        <Upload className="h-5 w-5" />
                        <span className="text-xs mt-1">Add</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Upload button when no images */}
                {images.length === 0 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full rounded-2xl border-2 border-dashed border-[#eeeee9] bg-[#fcfcf7] p-8 flex flex-col items-center gap-2 text-[#1c3a13]/50 hover:border-[#1c3a13] hover:bg-[#eeeee9] hover:text-[#1c3a13] transition-colors"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#eeeee9]">
                      <ImageIcon className="h-6 w-6 text-[#1c3a13]" />
                    </div>
                    <p className="text-sm font-medium">
                      {uploading ? "Uploading..." : "Click to upload photos"}
                    </p>
                    <p className="text-xs text-[#1c3a13]/40">JPEG, PNG, WebP · Max 5 MB each · Up to 5 photos</p>
                  </button>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />

                {uploadError && (
                  <p className="text-xs text-red-600">{uploadError}</p>
                )}
                {uploading && (
                  <p className="text-xs text-[#1c3a13] animate-pulse">Uploading images...</p>
                )}
              </div>
            </div>

            {/* Crop Type */}
            <div className="space-y-2">
              <Label htmlFor="cropType" className="text-[#1c3a13]">Crop Type *</Label>
              <Input
                id="cropType"
                list="crop-suggestions"
                placeholder="e.g. Tomatoes"
                value={form.cropType}
                onChange={(e) => update("cropType", e.target.value)}
                required
                className="bg-[#fcfcf7] border-[#eeeee9] text-[#1c3a13] rounded-lg focus:ring-[#1c3a13] focus:border-[#1c3a13]"
              />
              <datalist id="crop-suggestions">
                {COMMON_CROPS.map((crop) => (
                  <option key={crop} value={crop} />
                ))}
              </datalist>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category" className="text-[#1c3a13]">Category *</Label>
              <Select value={form.category} onValueChange={(v) => update("category", v)}>
                <SelectTrigger id="category" className="bg-[#fcfcf7] border-[#eeeee9] text-[#1c3a13] rounded-lg focus:ring-[#1c3a13]">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent className="bg-[#fcfcf7] border-[#eeeee9]">
                  {PRODUCE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value} className="text-[#1c3a13] focus:bg-[#eeeee9]">
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quantity + Unit */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity" className="text-[#1c3a13]">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  placeholder="e.g. 100"
                  min="0.01"
                  max="1000000"
                  step="0.01"
                  value={form.quantity}
                  onChange={(e) => update("quantity", e.target.value)}
                  required
                  className="bg-[#fcfcf7] border-[#eeeee9] text-[#1c3a13] rounded-lg focus:ring-[#1c3a13] focus:border-[#1c3a13]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit" className="text-[#1c3a13]">Unit *</Label>
                <Select value={form.unit} onValueChange={(v) => update("unit", v)}>
                  <SelectTrigger id="unit" className="bg-[#fcfcf7] border-[#eeeee9] text-[#1c3a13] rounded-lg focus:ring-[#1c3a13]">
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#fcfcf7] border-[#eeeee9]">
                    {UNITS.map((u) => (
                      <SelectItem key={u} value={u} className="text-[#1c3a13] focus:bg-[#eeeee9]">{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Price */}
            <div className="space-y-2">
              <Label htmlFor="pricePerUnit" className="text-[#1c3a13]">Price per Unit (GHS) *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#1c3a13]/40 font-medium">GHS</span>
                <Input
                  id="pricePerUnit"
                  type="number"
                  placeholder="0.00"
                  min="0.01"
                  max="100000"
                  step="0.01"
                  value={form.pricePerUnit}
                  onChange={(e) => update("pricePerUnit", e.target.value)}
                  required
                  className="pl-12 bg-[#fcfcf7] border-[#eeeee9] text-[#1c3a13] rounded-lg focus:ring-[#1c3a13] focus:border-[#1c3a13]"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-[#1c3a13]">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the quality, variety, growing practices, etc."
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                rows={3}
                className="bg-[#fcfcf7] border-[#eeeee9] text-[#1c3a13] rounded-lg focus:ring-[#1c3a13] focus:border-[#1c3a13]"
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="harvestDate" className="text-[#1c3a13]">Harvest Date</Label>
                <Input
                  id="harvestDate"
                  type="date"
                  value={form.harvestDate}
                  onChange={(e) => update("harvestDate", e.target.value)}
                  className="bg-[#fcfcf7] border-[#eeeee9] text-[#1c3a13] rounded-lg focus:ring-[#1c3a13] focus:border-[#1c3a13]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiryDate" className="text-[#1c3a13]">Expiry Date</Label>
                <Input
                  id="expiryDate"
                  type="date"
                  value={form.expiryDate}
                  onChange={(e) => update("expiryDate", e.target.value)}
                  className="bg-[#fcfcf7] border-[#eeeee9] text-[#1c3a13] rounded-lg focus:ring-[#1c3a13] focus:border-[#1c3a13]"
                />
              </div>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location" className="text-[#1c3a13]">Location *</Label>
              <Input
                id="location"
                placeholder="e.g. Tamale, Northern Region"
                value={form.location}
                onChange={(e) => update("location", e.target.value)}
                required
                className="bg-[#fcfcf7] border-[#eeeee9] text-[#1c3a13] rounded-lg focus:ring-[#1c3a13] focus:border-[#1c3a13]"
              />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label className="text-[#1c3a13]">Listing Status</Label>
              <div className="flex gap-3">
                {(["ACTIVE", "DRAFT"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => update("status", s)}
                    className={`flex-1 rounded-full border-2 py-2.5 text-sm font-medium transition-colors ${
                      form.status === s
                        ? s === "ACTIVE"
                          ? "border-[#1c3a13] bg-[#d3fa99] text-[#1c3a13]"
                          : "border-[#1c3a13] bg-[#eeeee9] text-[#1c3a13]"
                        : "border-[#eeeee9] text-[#1c3a13]/50 hover:border-[#1c3a13]"
                    }`}
                  >
                    {s === "ACTIVE" ? "Publish Now" : "Save as Draft"}
                  </button>
                ))}
              </div>
              <p className="text-xs text-[#1c3a13]/40">
                {form.status === "ACTIVE"
                  ? "Visible to buyers immediately."
                  : "Save as draft to publish later."}
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 rounded-full border-[#eeeee9] text-[#1c3a13] hover:bg-[#eeeee9] hover:border-[#1c3a13]"
                onClick={() => router.push("/farmer/listings")}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 rounded-full bg-[#1c3a13] text-[#fcfcf7] hover:bg-[#2a5219]"
                disabled={loading || uploading || !isVerified}
              >
                {loading ? "Creating..." : form.status === "ACTIVE" ? "Publish Listing" : "Save Draft"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
