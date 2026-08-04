"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Search, X, MapPin, Package, Calendar, ChevronLeft, ChevronRight, SlidersHorizontal, ShoppingCart, Warehouse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PRODUCE_CATEGORIES, NORTHERN_GHANA_REGIONS, formatCurrency, formatDate, getSpoilageUrgency } from "@/lib/utils";
import { FollowButton } from "@/components/shared/follow-button";
import { ProductImageSlideshow } from "@/components/shared/product-image-slideshow";
import { QuickMessageDialog } from "@/components/shared/quick-message-dialog";
import { BackButton } from "@/components/shared/back-button";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ListingFarmer {
  id: string;
  name: string;
  image: string | null;
  region: string | null;
  farmerProfile: { farmName: string; rating: number; location: string; acceptsCOD?: boolean } | null;
}

interface Listing {
  id: string;
  farmerId: string;
  farmer: ListingFarmer;
  cropType: string;
  category: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  currency: string;
  description: string | null;
  images: string[];
  harvestDate: string | null;
  expiryDate: string | null;
  location: string;
  status: string;
  createdAt: string;
  storageFacility: { id: string; name: string; location: string; storageTypes: string[] } | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_EMOJI: Record<string, string> = {
  VEGETABLES: "🥦",
  GRAINS: "🌾",
  TUBERS: "🍠",
  FRUITS: "🍎",
  LEGUMES: "🫘",
  LIVESTOCK: "🐄",
};

const CATEGORY_LABEL: Record<string, string> = {
  VEGETABLES: "Vegetables",
  GRAINS: "Grains",
  TUBERS: "Tubers",
  FRUITS: "Fruits",
  LEGUMES: "Legumes",
  LIVESTOCK: "Livestock",
};

function SkeletonCard() {
  return (
    <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] overflow-hidden animate-pulse">
      <div className="h-48 bg-[#eeeee9]" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-[#eeeee9] rounded w-3/4" />
        <div className="h-6 bg-[#eeeee9] rounded w-1/2" />
        <div className="h-3 bg-[#eeeee9] rounded w-full" />
        <div className="h-3 bg-[#eeeee9] rounded w-2/3" />
        <div className="h-3 bg-[#eeeee9] rounded w-3/4" />
        <div className="h-10 bg-[#eeeee9] rounded mt-4" />
      </div>
    </div>
  );
}

function ListingCard({
  listing,
  followData,
}: {
  listing: Listing;
  userRole: string | undefined;
  followData?: { isFollowing: boolean; followerCount: number };
}) {
  const emoji = CATEGORY_EMOJI[listing.category] ?? "🌿";
  const catLabel = CATEGORY_LABEL[listing.category] ?? listing.category;
  const farmName = listing.farmer.farmerProfile?.farmName ?? listing.farmer.name;
  // Where THIS produce actually is — not the farmer's registered base
  // location, which can differ (e.g. harvested/held away from the home farm).
  const produceLocation = listing.location || listing.farmer.farmerProfile?.location;
  const urgency = getSpoilageUrgency(listing.expiryDate);

  return (
    <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] overflow-hidden flex flex-col hover:border-[#1c3a13] transition-colors group">
      {/* Image slideshow */}
      <div className="relative h-48 flex-shrink-0">
        <ProductImageSlideshow
          images={listing.images ?? []}
          alt={listing.cropType}
          fallbackEmoji={emoji}
          className="h-full w-full"
        />
        <div className="absolute top-2 left-2 z-20">
          <Badge variant="success" className="text-xs">{catLabel}</Badge>
        </div>
        {urgency && (
          <div className="absolute top-2 right-2 z-20">
            <Badge
              className={`text-xs ${
                urgency.level === "critical"
                  ? "bg-red-100 text-red-700"
                  : urgency.level === "urgent"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-yellow-50 text-yellow-700"
              }`}
            >
              {urgency.label}
            </Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-4 space-y-2">
        <h3 className="font-medium text-[#1c3a13] text-base leading-tight truncate">{listing.cropType}</h3>

        <div className="flex items-baseline gap-1">
          <span className="text-xl font-bold text-[#1c3a13]">{formatCurrency(listing.pricePerUnit)}</span>
          <span className="text-sm text-[#1c3a13]/50">/ {listing.unit}</span>
        </div>

        <div className="flex items-center gap-1.5 text-sm text-[#1c3a13]/70">
          <Package className="h-4 w-4 text-[#1c3a13]/40 flex-shrink-0" />
          <span>{listing.quantity} {listing.unit} available</span>
        </div>

        {listing.harvestDate && (
          <div className="flex items-center gap-1.5 text-sm text-[#1c3a13]/70">
            <Calendar className="h-4 w-4 text-[#1c3a13]/40 flex-shrink-0" />
            <span>Harvested: {formatDate(listing.harvestDate)}</span>
          </div>
        )}

        <div className="flex items-center gap-1.5 text-sm text-[#1c3a13]/70">
          <MapPin className="h-4 w-4 text-[#1c3a13]/40 flex-shrink-0" />
          <span className="truncate">{produceLocation}</span>
        </div>

        {listing.storageFacility && (
          <div className="flex items-center gap-1.5 text-xs text-[#1c3a13]/70 bg-[#eeeee9] rounded-full px-2.5 py-1 w-fit">
            <Warehouse className="h-3.5 w-3.5 text-[#1c3a13]/50 flex-shrink-0" />
            <span className="truncate">Stored at {listing.storageFacility.name}</span>
          </div>
        )}

        {/* Farmer */}
        <div className="flex items-center gap-2 pt-2 border-t border-[#eeeee9]">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#eeeee9] text-xs font-semibold text-[#1c3a13] flex-shrink-0">
            {listing.farmer.name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-[#1c3a13] truncate">{farmName}</p>
            <p className="text-xs text-[#1c3a13]/50 truncate">{listing.farmer.name}</p>
          </div>
          <FollowButton
                  userId={listing.farmer.id}
                  size="sm"
                  initialFollowing={followData?.isFollowing}
                  initialFollowerCount={followData?.followerCount}
                />
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 pt-0 flex gap-2">
        <Button asChild className="flex-1 bg-[#1c3a13] hover:bg-[#2a5219] text-[#fcfcf7] rounded-full" size="sm">
          <Link href={`/marketplace/${listing.id}/order`}>
            <ShoppingCart className="h-3.5 w-3.5 mr-1" />
            Order Now
          </Link>
        </Button>
        <QuickMessageDialog
          recipientId={listing.farmer.id}
          recipientName={listing.farmer.name}
          listingId={listing.id}
          cropName={listing.cropType}
          trigger={
            <Button variant="outline" size="sm" title={`Message ${listing.farmer.name}`}
              className="rounded-full border-[#eeeee9] text-[#1c3a13] hover:bg-[#eeeee9] hover:border-[#1c3a13]">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </Button>
          }
        />
        <Button variant="outline" size="sm" asChild
          className="rounded-full border-[#eeeee9] text-[#1c3a13] hover:bg-[#eeeee9] hover:border-[#1c3a13]">
          <Link href={`/marketplace/${listing.id}`}>View</Link>
        </Button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MarketplacePage() {
  const { data: session } = useSession();
  const [listings, setListings] = useState<Listing[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 12, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [followMap, setFollowMap] = useState<Record<string, { isFollowing: boolean; followerCount: number }>>({});

  // Filter state
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState("");
  const [minPriceInput, setMinPriceInput] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [maxPriceInput, setMaxPriceInput] = useState("");
  const [region, setRegion] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const latestRequestId = useRef(0);
  const [availableCategories, setAvailableCategories] = useState<string[] | null>(null);

  useEffect(() => {
    fetch("/api/listings/facets")
      .then((r) => r.json())
      .then((d) => setAvailableCategories(d.categories ?? []))
      .catch(() => setAvailableCategories([]));
  }, []);

  // Only show categories that actually have active listings right now — the
  // full PRODUCE_CATEGORIES list stays as the label/emoji source of truth.
  const filterableCategories = PRODUCE_CATEGORIES.filter(
    (cat) => availableCategories === null || availableCategories.includes(cat.value)
  );

  const fetchListings = useCallback(async () => {
    // Guard against out-of-order responses: if the user changes filters again
    // before this request resolves, a later request's (correct) result could
    // otherwise be overwritten by an earlier one arriving after it.
    const requestId = ++latestRequestId.current;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (selectedCategories.length === 1) params.set("category", selectedCategories[0]);
      if (minPrice) params.set("minPrice", minPrice);
      if (maxPrice) params.set("maxPrice", maxPrice);
      if (region && region !== "all") params.set("region", region);
      if (sortBy === "urgency") params.set("sortBy", "urgency");
      params.set("page", String(page));
      params.set("limit", "12");

      const res = await fetch(`/api/listings?${params.toString()}`);
      const data = await res.json();
      if (requestId !== latestRequestId.current) return; // superseded by a newer request

      const newListings: Listing[] = data.listings ?? [];
      setPagination(data.pagination ?? { page: 1, limit: 12, total: 0, pages: 1 });

      // Await the follow batch before revealing cards so FollowButton always gets initialData
      if (newListings.length > 0 && session) {
        const uniqueIds = [...new Set(newListings.map((l) => l.farmer.id))];
        try {
          const followRes = await fetch(`/api/follow?ids=${uniqueIds.join(",")}`);
          const fm = await followRes.json() as Record<string, { isFollowing: boolean; followerCount: number }>;
          if (requestId !== latestRequestId.current) return;
          setFollowMap(fm);
        } catch {
          if (requestId === latestRequestId.current) setFollowMap({});
        }
      } else {
        setFollowMap({});
      }

      setListings(newListings);
    } catch {
      if (requestId === latestRequestId.current) setListings([]);
    } finally {
      if (requestId === latestRequestId.current) setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, selectedCategories, minPrice, maxPrice, region, sortBy, page, session?.user?.id]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  // Debounce typed input → committed search (triggers fetchListings via dependency)
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Debounce price inputs the same way — avoids firing a request per keystroke
  useEffect(() => {
    const t = setTimeout(() => {
      setMinPrice(minPriceInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [minPriceInput]);

  useEffect(() => {
    const t = setTimeout(() => {
      setMaxPrice(maxPriceInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [maxPriceInput]);

  function toggleCategory(cat: string) {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
    setPage(1);
  }

  function clearFilters() {
    setSelectedCategories([]);
    setMinPrice("");
    setMinPriceInput("");
    setMaxPrice("");
    setMaxPriceInput("");
    setRegion("");
    setSearch("");
    setSearchInput("");
    setPage(1);
  }

  const hasActiveFilters =
    selectedCategories.length > 0 || minPriceInput || maxPriceInput || (region && region !== "all") || searchInput;

  return (
    <div className="min-h-screen bg-[#fcfcf7]">
      {/* Header */}
      <div className="bg-[#fcfcf7] border-b border-[#eeeee9] sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <BackButton iconOnly />

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 mr-2 flex-shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d3fa99]">
                <span className="text-[#1c3a13] font-bold text-xs">L</span>
              </div>
              <span className="font-medium text-[#1c3a13] hidden sm:block tracking-tight">Lorgric</span>
            </Link>

            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1c3a13]/40" />
              <Input
                type="text"
                placeholder="Search crops, locations..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10 rounded-full bg-[#fcfcf7] border-[#eeeee9] focus:ring-[#1c3a13]"
                autoComplete="off"
                autoCorrect="off"
              />
            </div>

            {/* Mobile filter toggle */}
            <Button
              variant="outline"
              size="icon"
              className="lg:hidden flex-shrink-0 rounded-full border-[#eeeee9] text-[#1c3a13] hover:bg-[#eeeee9] hover:border-[#1c3a13]"
              onClick={() => setShowFilters(!showFilters)}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Filter Sidebar */}
          <aside
            className={`
              flex-shrink-0 w-64 space-y-6
              ${showFilters ? "block" : "hidden"} lg:block
              lg:static fixed inset-y-0 left-0 z-50 bg-[#fcfcf7] lg:bg-transparent w-72 lg:w-64
              overflow-y-auto lg:overflow-visible p-6 lg:p-0
            `}
          >
            {/* Mobile close */}
            <div className="flex items-center justify-between lg:hidden">
              <h3 className="font-medium text-[#1c3a13]">Filters</h3>
              <button onClick={() => setShowFilters(false)}>
                <X className="h-5 w-5 text-[#1c3a13]/50" />
              </button>
            </div>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 font-medium"
              >
                <X className="h-3.5 w-3.5" />
                Clear all filters
              </button>
            )}

            {/* Categories */}
            <div className="bg-[#eeeee9] rounded-2xl p-4 space-y-3">
              <h3 className="font-medium text-[#1c3a13] text-sm">Category</h3>
              <div className="space-y-2">
                {filterableCategories.length === 0 && (
                  <p className="text-xs text-[#1c3a13]/40">No categories available yet.</p>
                )}
                {filterableCategories.map((cat) => (
                  <label key={cat.value} className="flex items-center gap-2.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(cat.value)}
                      onChange={() => toggleCategory(cat.value)}
                      className="h-4 w-4 rounded border-[#eeeee9] text-[#1c3a13] focus:ring-[#1c3a13]"
                    />
                    <span className="text-sm text-[#1c3a13] group-hover:text-[#1c3a13]">
                      {CATEGORY_EMOJI[cat.value]} {cat.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div className="bg-[#eeeee9] rounded-2xl p-4 space-y-3">
              <h3 className="font-medium text-[#1c3a13] text-sm">Price Range (GHS)</h3>
              <div className="space-y-2">
                <div>
                  <Label htmlFor="minPrice" className="text-xs text-[#1c3a13]/50">Min price</Label>
                  <Input
                    id="minPrice"
                    type="number"
                    placeholder="0"
                    min="0"
                    value={minPriceInput}
                    onChange={(e) => setMinPriceInput(e.target.value)}
                    className="mt-1 bg-[#fcfcf7] border-[#eeeee9] rounded-lg focus:ring-[#1c3a13]"
                  />
                </div>
                <div>
                  <Label htmlFor="maxPrice" className="text-xs text-[#1c3a13]/50">Max price</Label>
                  <Input
                    id="maxPrice"
                    type="number"
                    placeholder="Any"
                    min="0"
                    value={maxPriceInput}
                    onChange={(e) => setMaxPriceInput(e.target.value)}
                    className="mt-1 bg-[#fcfcf7] border-[#eeeee9] rounded-lg focus:ring-[#1c3a13]"
                  />
                </div>
              </div>
            </div>

            {/* Region */}
            <div className="bg-[#eeeee9] rounded-2xl p-4 space-y-3">
              <h3 className="font-medium text-[#1c3a13] text-sm">Region</h3>
              <Select value={region} onValueChange={(v) => { setRegion(v); setPage(1); }}>
                <SelectTrigger className="bg-[#fcfcf7] border-[#eeeee9] focus:ring-[#1c3a13]">
                  <SelectValue placeholder="All regions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All regions</SelectItem>
                  {NORTHERN_GHANA_REGIONS.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </aside>

          {/* Mobile overlay */}
          {showFilters && (
            <div
              className="lg:hidden fixed inset-0 z-40 bg-black/50"
              onClick={() => setShowFilters(false)}
            />
          )}

          {/* Main Content */}
          <div className="flex-1 min-w-0 space-y-5">
            {/* Results header */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-xl font-light text-[#1c3a13] tracking-tight">Marketplace</h1>
                <p className="text-sm text-[#1c3a13]/50">
                  {loading ? " " : `${pagination.total} listing${pagination.total !== 1 ? "s" : ""} found`}
                  {search && <span className="ml-1">for &ldquo;{search}&rdquo;</span>}
                </p>
              </div>
              <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setPage(1); }}>
                <SelectTrigger className="w-[220px] bg-[#fcfcf7] border-[#eeeee9] focus:ring-[#1c3a13]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest first</SelectItem>
                  <SelectItem value="urgency">Spoiling soon — sell first</SelectItem>
                </SelectContent>
              </Select>
              {hasActiveFilters && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedCategories.map((c) => (
                    <span
                      key={c}
                      className="inline-flex items-center gap-1 rounded-full bg-[#d3fa99] px-2 py-0.5 text-xs text-[#1c3a13]"
                    >
                      {CATEGORY_LABEL[c]}
                      <button onClick={() => toggleCategory(c)}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  {search && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#d3fa99] px-2 py-0.5 text-xs text-[#1c3a13]">
                      &ldquo;{search}&rdquo;
                      <button onClick={() => { setSearch(""); setSearchInput(""); setPage(1); }}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Listings Grid */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : listings.length === 0 ? (
              <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] py-20 text-center">
                <div className="text-6xl mb-4" role="img">🔍</div>
                <h3 className="text-lg font-light text-[#1c3a13] tracking-tight mb-2">No listings found</h3>
                <p className="text-[#1c3a13]/50 text-sm mb-4">
                  Try adjusting your search or filters to find more produce.
                </p>
                <Button variant="outline" onClick={clearFilters} className="rounded-full border-[#eeeee9] text-[#1c3a13] hover:bg-[#eeeee9] hover:border-[#1c3a13]">Clear filters</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {listings.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    userRole={session?.user.role}
                    followData={followMap[listing.farmer.id]}
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            {!loading && pagination.pages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-full border-[#eeeee9] text-[#1c3a13] hover:bg-[#eeeee9] hover:border-[#1c3a13] disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>

                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                    let pageNum: number;
                    if (pagination.pages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= pagination.pages - 2) {
                      pageNum = pagination.pages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`h-8 w-8 rounded-full text-sm font-medium transition-colors ${
                          pageNum === page
                            ? "bg-[#1c3a13] text-[#fcfcf7]"
                            : "text-[#1c3a13]/70 hover:bg-[#eeeee9] hover:text-[#1c3a13]"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                  disabled={page >= pagination.pages}
                  className="rounded-full border-[#eeeee9] text-[#1c3a13] hover:bg-[#eeeee9] hover:border-[#1c3a13] disabled:opacity-40"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
