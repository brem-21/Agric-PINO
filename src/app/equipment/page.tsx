"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Package, ShoppingCart, Search, Loader2, Store, X, Plus, Minus, CheckCircle, MessageSquare } from "lucide-react";
import { ProductImageSlideshow } from "@/components/shared/product-image-slideshow";
import { QuickMessageDialog } from "@/components/shared/quick-message-dialog";
import { BackButton } from "@/components/shared/back-button";
import { formatCurrency } from "@/lib/utils";

type Product = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  price: number;
  unit: string;
  stock: number;
  images: string[];
  vendor: { id: string; userId: string; shopName: string; location: string; rating: number };
};

type CartItem = Product & { quantity: number };

const CATEGORIES = [
  { value: "", label: "All" },
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

export default function EquipmentMarketplacePage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState("");

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (category) params.set("category", category);
    const res = await fetch(`/api/equipment?${params}`);
    const data = await res.json();
    setProducts(data.products ?? []);
    setLoading(false);
  }, [search, category]);

  useEffect(() => {
    const t = setTimeout(fetchProducts, 300);
    return () => clearTimeout(t);
  }, [fetchProducts]);

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) return prev.map((i) => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...product, quantity: 1 }];
    });
  }

  function updateQty(productId: string, delta: number) {
    setCart((prev) => prev.map((i) => i.id === productId ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i).filter((i) => i.quantity > 0));
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((i) => i.id !== productId));
  }

  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  async function checkout() {
    if (!session) { router.push("/auth/login"); return; }

    const vendorGroups = new Map<string, CartItem[]>();
    for (const item of cart) {
      const existing = vendorGroups.get(item.vendor.id) ?? [];
      vendorGroups.set(item.vendor.id, [...existing, item]);
    }

    setCheckoutLoading(true);
    try {
      for (const [vendorId, items] of vendorGroups) {
        await fetch("/api/vendor/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vendorId,
            items: items.map((i) => ({ productId: i.id, quantity: i.quantity })),
            deliveryAddress: deliveryAddress || undefined,
          }),
        });
      }
      setCart([]);
      setShowCart(false);
      setOrderSuccess(true);
      setTimeout(() => setOrderSuccess(false), 5000);
    } finally {
      setCheckoutLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#fcfcf7]">
      {/* Header */}
      <div className="bg-[#fcfcf7] border-b border-[#eeeee9]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <BackButton iconOnly />
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1c3a13]">
                <Store className="h-5 w-5 text-[#fcfcf7]" />
              </div>
              <div>
                <h1 className="text-xl font-light tracking-tight text-[#1c3a13]">Equipment Marketplace</h1>
                <p className="text-xs text-[#1c3a13]/50">Farm tools & inputs from verified vendors</p>
              </div>
            </div>
            <button
              onClick={() => setShowCart(true)}
              className="relative inline-flex items-center gap-2 rounded-full bg-[#1c3a13] px-4 py-2 text-sm font-semibold text-[#fcfcf7] hover:bg-[#2a5219] transition-colors"
            >
              <ShoppingCart className="h-4 w-4" />
              Cart
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">{cartCount}</span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Success banner */}
        {orderSuccess && (
          <div className="mb-4 flex items-center gap-2 rounded-2xl bg-[#d3fa99] border border-[#eeeee9] px-4 py-3 text-[#1c3a13] text-sm">
            <CheckCircle className="h-5 w-5 text-[#1c3a13]" />
            Order placed successfully! Check your purchase history for updates.
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1c3a13]/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full rounded-lg border border-[#eeeee9] bg-[#fcfcf7] pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1c3a13]"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${category === c.value ? "bg-[#1c3a13] text-[#fcfcf7]" : "border border-[#eeeee9] text-[#1c3a13]/70 hover:bg-[#eeeee9]"}`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Products grid */}
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-[#1c3a13]" /></div>
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <Package className="h-12 w-12 mx-auto mb-4 text-[#1c3a13]/40" />
            <p className="text-[#1c3a13]/50">No products found.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => {
              const cartItem = cart.find((i) => i.id === product.id);
              return (
                <Card key={product.id} className="bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl overflow-hidden">
                  <div className="h-40 w-full">
                    <ProductImageSlideshow
                      images={product.images ?? []}
                      alt={product.name}
                      fallbackEmoji="🧰"
                      autoAdvanceMs={5000}
                      className="h-full w-full"
                    />
                  </div>
                  <CardContent className="p-4">
                    <div className="mb-2">
                      <h3 className="font-medium text-[#1c3a13] leading-tight">{product.name}</h3>
                      <p className="text-xs text-[#1c3a13]/70 font-medium mt-0.5">{product.vendor.shopName}</p>
                    </div>
                    {product.description && (
                      <p className="text-xs text-[#1c3a13]/50 line-clamp-2 mb-3">{product.description}</p>
                    )}
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-lg text-[#1c3a13]">{formatCurrency(product.price)}</span>
                      <span className="text-xs text-[#1c3a13]/40">per {product.unit}</span>
                    </div>
                    <p className={`text-xs mb-3 ${product.stock < 10 ? "text-red-500" : "text-[#1c3a13]/50"}`}>
                      {product.stock} in stock
                    </p>
                    {cartItem ? (
                      <div className="flex items-center justify-between bg-[#eeeee9] rounded-lg px-3 py-2">
                        <button onClick={() => updateQty(product.id, -1)} className="text-[#1c3a13] hover:text-[#2a5219]"><Minus className="h-4 w-4" /></button>
                        <span className="text-sm font-bold text-[#1c3a13]">{cartItem.quantity}</span>
                        <button onClick={() => updateQty(product.id, 1)} disabled={cartItem.quantity >= product.stock} className="text-[#1c3a13] hover:text-[#2a5219] disabled:opacity-40"><Plus className="h-4 w-4" /></button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(product)}
                        disabled={product.stock === 0}
                        className="w-full rounded-full bg-[#1c3a13] py-2 text-sm font-semibold text-[#fcfcf7] hover:bg-[#2a5219] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        {product.stock === 0 ? "Out of Stock" : "Add to Cart"}
                      </button>
                    )}
                    {product.vendor.userId && (
                      <QuickMessageDialog
                        recipientId={product.vendor.userId}
                        recipientName={product.vendor.shopName}
                        trigger={
                          <button className="mt-2 flex items-center justify-center gap-1.5 w-full rounded-full border border-[#eeeee9] py-1.5 text-xs font-medium text-[#1c3a13] hover:bg-[#eeeee9] transition-colors">
                            <MessageSquare className="h-3.5 w-3.5" />
                            Message Vendor
                          </button>
                        }
                      />
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Cart drawer */}
      {showCart && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setShowCart(false)} />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-[#fcfcf7] flex flex-col">
            <div className="flex items-center justify-between px-4 py-4 border-b border-[#eeeee9]">
              <h2 className="text-lg font-light tracking-tight text-[#1c3a13]">Your Cart</h2>
              <button onClick={() => setShowCart(false)} className="text-[#1c3a13]/40 hover:text-[#1c3a13]"><X className="h-6 w-6" /></button>
            </div>
            {cart.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-[#1c3a13]/40">
                <div className="text-center">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Your cart is empty</p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-start gap-3 p-3 bg-[#eeeee9] rounded-2xl">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#1c3a13] truncate">{item.name}</p>
                        <p className="text-xs text-[#1c3a13]/50">{item.vendor.shopName}</p>
                        <p className="text-sm font-bold text-[#1c3a13] mt-1">{formatCurrency(item.price * item.quantity)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateQty(item.id, -1)} className="text-[#1c3a13]/50 hover:text-[#1c3a13]"><Minus className="h-4 w-4" /></button>
                        <span className="text-sm font-medium w-6 text-center text-[#1c3a13]">{item.quantity}</span>
                        <button onClick={() => updateQty(item.id, 1)} className="text-[#1c3a13]/50 hover:text-[#1c3a13]"><Plus className="h-4 w-4" /></button>
                        <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600 ml-1"><X className="h-4 w-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-4 border-t border-[#eeeee9] space-y-3">
                  <input
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Delivery address (optional)"
                    className="w-full rounded-lg border border-[#eeeee9] bg-[#fcfcf7] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1c3a13]"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#1c3a13]/70">Total</span>
                    <span className="text-lg font-bold text-[#1c3a13]">{formatCurrency(cartTotal)}</span>
                  </div>
                  <button
                    onClick={checkout}
                    disabled={checkoutLoading}
                    className="w-full rounded-full bg-[#1c3a13] py-3 text-sm font-semibold text-[#fcfcf7] hover:bg-[#2a5219] disabled:opacity-60 transition-colors"
                  >
                    {checkoutLoading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : session ? "Place Order" : "Sign in to Order"}
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
