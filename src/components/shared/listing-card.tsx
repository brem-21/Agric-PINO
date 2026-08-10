"use client"

import * as React from "react"
import Link from "next/link"
import { MapPin, Calendar, Package, Star, ShoppingCart } from "lucide-react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ProductImageSlideshow } from "@/components/shared/product-image-slideshow"

// ─── Types matching the Prisma schema ────────────────────────────────────────

type ProduceCategory =
  | "VEGETABLES"
  | "TUBERS"
  | "FRUITS"

type ListingStatus = "ACTIVE" | "SOLD" | "EXPIRED" | "DRAFT"

interface ListingFarmer {
  id: string
  name: string
  image?: string | null
  region?: string | null
  district?: string | null
  farmerProfile?: {
    farmName: string
    location: string
    rating: number
    totalRatings: number
    acceptsCOD?: boolean
  } | null
}

export interface ProduceListing {
  id: string
  farmerId: string
  farmer: ListingFarmer
  cropType: string
  category: ProduceCategory
  quantity: number
  unit: string
  pricePerUnit: number
  currency: string
  description?: string | null
  images: string[]
  harvestDate?: Date | string | null
  expiryDate?: Date | string | null
  location: string
  status: ListingStatus
  createdAt: Date | string
  updatedAt: Date | string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CATEGORY_EMOJI: Record<ProduceCategory, string> = {
  VEGETABLES: "🥦",
  TUBERS: "🍠",
  FRUITS: "🍎",
}

const CATEGORY_LABEL: Record<ProduceCategory, string> = {
  VEGETABLES: "Vegetables",
  TUBERS: "Tubers",
  FRUITS: "Fruits",
}

const CATEGORY_BADGE_VARIANT: Record<
  ProduceCategory,
  "default" | "secondary" | "warning" | "success" | "destructive" | "outline"
> = {
  VEGETABLES: "success",
  TUBERS: "secondary",
  FRUITS: "default",
}

function formatDate(date?: Date | string | null): string {
  if (!date) return "N/A"
  return new Date(date).toLocaleDateString("en-GH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: currency === "GHS" ? "GHS" : currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

function StarRating({ rating, total }: { rating: number; total: number }) {
  const rounded = Math.round(rating * 2) / 2 // nearest 0.5
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i < Math.floor(rounded)
        const half = !filled && i < rounded
        return (
          <Star
            key={i}
            className={`h-3.5 w-3.5 ${
              filled
                ? "fill-amber-400 stroke-amber-400"
                : half
                ? "fill-amber-200 stroke-amber-400"
                : "fill-[#eeeee9] stroke-[#c4c7c4]"
            }`}
          />
        )
      })}
      {total > 0 && (
        <span className="text-xs text-[#1c3a13]/50 ml-0.5">
          {rating.toFixed(1)} ({total})
        </span>
      )}
      {total === 0 && <span className="text-xs text-[#1c3a13]/40 ml-0.5">No ratings yet</span>}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ListingCardProps {
  listing: ProduceListing
  onOrderNow?: (listingId: string) => void
}

export default function ListingCard({ listing, onOrderNow }: ListingCardProps) {
  const {
    id,
    farmer,
    cropType,
    category,
    quantity,
    unit,
    pricePerUnit,
    currency,
    images,
    harvestDate,
    location,
    status,
  } = listing

  const farmerProfile = farmer.farmerProfile
  const rating = farmerProfile?.rating ?? 0
  const totalRatings = farmerProfile?.totalRatings ?? 0
  const farmerLocation = farmerProfile?.location ?? location
  const isActive = status === "ACTIVE"
  const acceptsCOD = farmerProfile?.acceptsCOD ?? true

  return (
    <Card className="group overflow-hidden flex flex-col h-full bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl transition-colors hover:border-[#1c3a13]">
      {/* Image slideshow */}
      <div className="relative h-48 w-full flex-shrink-0">
        <ProductImageSlideshow
          images={images ?? []}
          alt={cropType}
          fallbackEmoji={CATEGORY_EMOJI[category]}
          className="h-full w-full"
        />

        {/* Status badge overlay */}
        {!isActive && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-20 pointer-events-none">
            <span className="rounded-full bg-[#fcfcf7]/90 px-3 py-1 text-xs font-semibold text-[#1c3a13] uppercase tracking-wider">
              {status === "SOLD" ? "Sold Out" : status === "EXPIRED" ? "Expired" : "Draft"}
            </span>
          </div>
        )}

        {/* Category badge */}
        <div className="absolute top-2 left-2 z-20">
          <Badge variant={CATEGORY_BADGE_VARIANT[category]}>{CATEGORY_LABEL[category]}</Badge>
        </div>

        {/* COD badge */}
        {isActive && acceptsCOD && (
          <div className="absolute top-2 right-2 z-20">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#d3fa99] px-2 py-0.5 text-[10px] font-semibold text-[#1c3a13]">
              <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 17h18v2H2v-2Zm1-4h16l-2-7H5L3 13Zm5 0V7m4 6V7" />
              </svg>
              COD
            </span>
          </div>
        )}
      </div>

      <CardContent className="flex flex-col gap-3 p-4 flex-1">
        {/* Crop name */}
        <div>
          <h3 className="font-medium text-[#1c3a13] text-base leading-tight line-clamp-1 tracking-tight">
            {cropType}
          </h3>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-bold text-[#1c3a13]">
            {formatPrice(pricePerUnit, currency)}
          </span>
          <span className="text-sm text-[#1c3a13]/50">/ {unit}</span>
        </div>

        {/* Quantity */}
        <div className="flex items-center gap-1.5 text-sm text-[#1c3a13]/70">
          <Package className="h-4 w-4 text-[#1c3a13]/40 flex-shrink-0" />
          <span>
            {quantity.toLocaleString("en-GH")} {unit} available
          </span>
        </div>

        {/* Harvest date */}
        <div className="flex items-center gap-1.5 text-sm text-[#1c3a13]/70">
          <Calendar className="h-4 w-4 text-[#1c3a13]/40 flex-shrink-0" />
          <span>Harvested: {formatDate(harvestDate)}</span>
        </div>

        {/* Location */}
        <div className="flex items-center gap-1.5 text-sm text-[#1c3a13]/70">
          <MapPin className="h-4 w-4 text-[#1c3a13]/40 flex-shrink-0" />
          <span className="line-clamp-1">{farmerLocation}</span>
        </div>

        {/* Farmer info */}
        <div className="flex items-center gap-2 pt-1 border-t border-[#eeeee9]">
          {farmer.image ? (
            <img
              src={farmer.image}
              alt={farmer.name}
              className="h-8 w-8 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#eeeee9] text-xs font-semibold text-[#1c3a13] flex-shrink-0">
              {farmer.name
                .split(" ")
                .map((p) => p[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)}
            </span>
          )}
          <div className="min-w-0">
            <p className="text-xs font-medium text-[#1c3a13] truncate">
              {farmerProfile?.farmName ?? farmer.name}
            </p>
            <p className="text-xs text-[#1c3a13]/50 truncate">{farmer.name}</p>
          </div>
        </div>

        {/* Rating */}
        <StarRating rating={rating} total={totalRatings} />
      </CardContent>

      <CardFooter className="p-4 pt-0 gap-2 flex">
        <Button
          className="flex-1 rounded-full bg-[#1c3a13] text-[#fcfcf7] hover:bg-[#2a5219]"
          disabled={!isActive}
          onClick={() => onOrderNow?.(id)}
          asChild={isActive && !onOrderNow}
        >
          {isActive && !onOrderNow ? (
            <Link href={`/marketplace/${id}/order`}>
              <ShoppingCart className="h-4 w-4" />
              Order Now
            </Link>
          ) : (
            <>
              <ShoppingCart className="h-4 w-4" />
              {isActive ? "Order Now" : "Unavailable"}
            </>
          )}
        </Button>
        <Button variant="outline" size="icon" className="rounded-full border-[#eeeee9] hover:border-[#1c3a13] text-[#1c3a13]" asChild>
          <Link href={`/marketplace/${id}`} aria-label="View listing details">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
