"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Loader2, ArrowLeft, ShieldAlert } from "lucide-react";
import Link from "next/link";

const CATEGORIES = [
  { value: "EQUIPMENT", label: "Equipment" },
  { value: "SEEDS", label: "Seeds" },
  { value: "FERTILIZERS", label: "Fertilizers" },
  { value: "PESTICIDES", label: "Pesticides" },
  { value: "TOOLS", label: "Tools" },
  { value: "IRRIGATION", label: "Irrigation" },
  { value: "ANIMAL_FEED", label: "Animal Feed" },
  { value: "STORAGE", label: "Storage" },
  { value: "OTHER", label: "Other" },
];

export default function NewProductPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const isVerified = !!session?.user?.isVerified;
  const [form, setForm] = useState({
    name: "",
    category: "SEEDS",
    description: "",
    price: "",
    unit: "",
    stock: "0",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/vendor/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          price: parseFloat(form.price),
          stock: parseInt(form.stock, 10),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to create product"); return; }
      router.push("/vendor/products");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <Link href="/vendor/products" className="inline-flex items-center gap-1.5 text-sm text-[#1c3a13] hover:text-[#1c3a13]/70">
        <ArrowLeft className="h-4 w-4" /> Back to products
      </Link>

      <Card className="bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 font-light tracking-tight text-[#1c3a13]">
            <Package className="h-5 w-5 text-[#1c3a13]" />
            Add New Product
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isVerified && (
              <div className="flex items-start gap-3 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                <ShieldAlert className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div>
                  Verify your account before listing products.{" "}
                  <Link href="/verification" className="font-medium underline hover:no-underline">
                    Apply for verification
                  </Link>
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-[#1c3a13] mb-1">Product Name *</label>
              <input
                name="name"
                required
                value={form.name}
                onChange={handleChange}
                className="w-full rounded-lg border border-[#eeeee9] bg-[#fcfcf7] px-3 py-2 text-sm text-[#1c3a13] focus:outline-none focus:ring-2 focus:ring-[#1c3a13]"
                placeholder="e.g. NPK 15-15-15 Fertilizer"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1c3a13] mb-1">Category *</label>
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                className="w-full rounded-lg border border-[#eeeee9] bg-[#fcfcf7] px-3 py-2 text-sm text-[#1c3a13] focus:outline-none focus:ring-2 focus:ring-[#1c3a13]"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1c3a13] mb-1">Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                className="w-full rounded-lg border border-[#eeeee9] bg-[#fcfcf7] px-3 py-2 text-sm text-[#1c3a13] focus:outline-none focus:ring-2 focus:ring-[#1c3a13] resize-none"
                placeholder="Describe the product..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-[#1c3a13] mb-1">Price (GHS) *</label>
                <input
                  name="price"
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-[#eeeee9] bg-[#fcfcf7] px-3 py-2 text-sm text-[#1c3a13] focus:outline-none focus:ring-2 focus:ring-[#1c3a13]"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1c3a13] mb-1">Unit *</label>
                <input
                  name="unit"
                  required
                  value={form.unit}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-[#eeeee9] bg-[#fcfcf7] px-3 py-2 text-sm text-[#1c3a13] focus:outline-none focus:ring-2 focus:ring-[#1c3a13]"
                  placeholder="e.g. bag, litre, unit"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1c3a13] mb-1">Initial Stock</label>
              <input
                name="stock"
                type="number"
                min="0"
                value={form.stock}
                onChange={handleChange}
                className="w-full rounded-lg border border-[#eeeee9] bg-[#fcfcf7] px-3 py-2 text-sm text-[#1c3a13] focus:outline-none focus:ring-2 focus:ring-[#1c3a13]"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading || !isVerified}
              className="w-full rounded-full bg-[#1c3a13] py-2.5 text-sm font-semibold text-[#fcfcf7] hover:bg-[#2a5219] disabled:opacity-60 transition-colors"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Add Product"}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
