"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Package, PlusCircle, Loader2, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type Product = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  price: number;
  unit: string;
  stock: number;
  isAvailable: boolean;
};

const CATEGORY_LABELS: Record<string, string> = {
  EQUIPMENT: "Equipment", SEEDS: "Seeds", FERTILIZERS: "Fertilizers",
  PESTICIDES: "Pesticides", TOOLS: "Tools", IRRIGATION: "Irrigation",
  ANIMAL_FEED: "Animal Feed", STORAGE: "Storage", OTHER: "Other",
};

export default function VendorProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const fetchProducts = () => {
    fetch("/api/vendor/products")
      .then((r) => r.json())
      .then((d) => setProducts(d.products ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchProducts(); }, []);

  async function toggleAvailability(product: Product) {
    setActing(product.id);
    await fetch(`/api/vendor/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAvailable: !product.isAvailable }),
    });
    fetchProducts();
    setActing(null);
  }

  async function deleteProduct(id: string) {
    if (!confirm("Delete this product?")) return;
    setActing(id);
    await fetch(`/api/vendor/products/${id}`, { method: "DELETE" });
    fetchProducts();
    setActing(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light tracking-tight text-[#1c3a13]">My Products</h1>
          <p className="text-[#1c3a13]/50 text-sm mt-1">{products.length} products in your shop</p>
        </div>
        <Link
          href="/vendor/products/new"
          className="inline-flex items-center gap-1.5 rounded-full bg-[#1c3a13] px-4 py-2 text-sm font-semibold text-[#fcfcf7] hover:bg-[#2a5219] transition-colors"
        >
          <PlusCircle className="h-4 w-4" />
          Add Product
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-[#1c3a13]" />
        </div>
      ) : products.length === 0 ? (
        <Card className="bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl">
          <CardContent className="py-16 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-[#1c3a13]/40" />
            <p className="text-[#1c3a13]/50 mb-4">No products yet.</p>
            <Link
              href="/vendor/products/new"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#1c3a13] px-4 py-2 text-sm font-semibold text-[#fcfcf7] hover:bg-[#2a5219]"
            >
              <PlusCircle className="h-4 w-4" />
              Add your first product
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <Card key={product.id} className={`bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl transition-opacity ${!product.isAvailable ? "opacity-60" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-medium text-[#1c3a13] leading-tight">{product.name}</h3>
                  <span className="shrink-0 text-xs px-2 py-0.5 rounded-full font-medium bg-[#eeeee9] text-[#1c3a13]">
                    {CATEGORY_LABELS[product.category] ?? product.category}
                  </span>
                </div>
                {product.description && (
                  <p className="text-xs text-[#1c3a13]/50 mb-3 line-clamp-2">{product.description}</p>
                )}
                <div className="flex items-center justify-between text-sm mb-3">
                  <span className="font-bold text-[#1c3a13]">{formatCurrency(product.price)}/{product.unit}</span>
                  <span className={`text-xs font-medium ${product.stock < 10 ? "text-red-600" : "text-[#1c3a13]/70"}`}>
                    Stock: {product.stock}
                  </span>
                </div>
                <div className="flex items-center gap-2 pt-3 border-t border-[#eeeee9]">
                  <button
                    onClick={() => toggleAvailability(product)}
                    disabled={!!acting}
                    title={product.isAvailable ? "Mark unavailable" : "Mark available"}
                    className={`p-1.5 rounded-full transition-colors ${product.isAvailable ? "text-[#1c3a13] hover:bg-[#eeeee9]" : "text-[#1c3a13]/40 hover:bg-[#eeeee9]"}`}
                  >
                    {acting === product.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : product.isAvailable ? (
                      <ToggleRight className="h-5 w-5" />
                    ) : (
                      <ToggleLeft className="h-5 w-5" />
                    )}
                  </button>
                  <span className="text-xs text-[#1c3a13]/40 flex-1">
                    {product.isAvailable ? "Available" : "Unavailable"}
                  </span>
                  <button
                    onClick={() => deleteProduct(product.id)}
                    disabled={!!acting}
                    className="p-1.5 rounded-full text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
