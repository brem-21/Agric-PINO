import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import { TrackingTimeline } from "@/components/shared/tracking-timeline";
import { VerifiedBadge } from "@/components/shared/verified-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Package, User, Leaf, Phone, Route, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { DeliveryMap } from "@/components/shared/delivery-map";
import { LiveRiderTracker } from "@/components/shared/live-rider-tracker";

const CATEGORY_PLACEHOLDER: Record<string, { emoji: string; bg: string }> = {
  VEGETABLES: { emoji: "🥬", bg: "bg-[#eeeee9]" },
  GRAINS: { emoji: "🌾", bg: "bg-[#eeeee9]" },
  TUBERS: { emoji: "🍠", bg: "bg-[#eeeee9]" },
  FRUITS: { emoji: "🍎", bg: "bg-[#eeeee9]" },
  LEGUMES: { emoji: "🫘", bg: "bg-[#eeeee9]" },
  LIVESTOCK: { emoji: "🐄", bg: "bg-[#eeeee9]" },
};

const STATUS_BADGE: Record<string, "default" | "warning" | "success" | "destructive" | "secondary"> = {
  PENDING: "warning",
  CONFIRMED: "default",
  PROCESSING: "default",
  READY_FOR_PICKUP: "warning",
  IN_TRANSIT: "default",
  DELIVERED: "success",
  CANCELLED: "destructive",
};

export default async function TrackingPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      listing: {
        select: {
          cropType: true,
          unit: true,
          images: true,
          location: true,
          category: true,
        },
      },
      buyer: {
        select: {
          name: true,
          phone: true,
          isVerified: true,
          verifiedAt: true,
          buyerProfile: { select: { businessName: true } },
        },
      },
      farmer: {
        select: {
          name: true,
          phone: true,
          isVerified: true,
          verifiedAt: true,
          farmerProfile: { select: { farmName: true, location: true } },
        },
      },
      payment: { select: { status: true, method: true } },
      transportRequest: {
        include: {
          provider: {
            include: {
              user: { select: { name: true, phone: true } },
            },
          },
          legs: {
            include: { provider: { include: { user: { select: { name: true } } } } },
            orderBy: { sequence: "asc" },
          },
        },
      },
    },
  });

  if (!order) notFound();

  const transportProvider = order.transportRequest?.provider
    ? {
        name: order.transportRequest.provider.user.name,
        phone: order.transportRequest.provider.user.phone ?? "",
        vehicleType: order.transportRequest.provider.vehicleType,
      }
    : null;

  return (
    <div className="min-h-screen bg-[#fcfcf7]">
      {/* Header */}
      <div className="bg-[#1c3a13] text-[#fcfcf7] py-6 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <Link href="/" className="flex items-center gap-2">
              <Leaf className="h-5 w-5" />
              <span className="font-medium">Lorgric</span>
            </Link>
            <Link
              href={`/delivery/${orderId}`}
              className="flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1.5 text-sm font-medium text-[#fcfcf7] hover:bg-white/10 hover:border-white/40 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </div>
          <h1 className="text-xl font-light tracking-tight">Order Tracking</h1>
          <p className="text-[#fcfcf7]/70 text-sm mt-1">
            #{orderId.slice(-8).toUpperCase()} · Placed {formatDate(order.createdAt)}
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Status banner */}
        <Card className="bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#1c3a13]/50">Current Status</p>
                <div className="mt-1">
                  <Badge variant={STATUS_BADGE[order.status] ?? "secondary"}>
                    {order.status.replace(/_/g, " ")}
                  </Badge>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-[#1c3a13]/50">Total</p>
                <p className="text-xl font-bold text-[#1c3a13]">
                  {formatCurrency(order.totalAmount)}
                </p>
                {order.payment && (
                  <p className="text-xs text-[#1c3a13]/40">
                    {order.payment.status === "PAID" ? "✓ Paid" : "Payment pending"}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tracking timeline */}
        <Card className="bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base font-medium text-[#1c3a13]">Delivery Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <TrackingTimeline
              currentStatus={order.status as never}
              updatedAt={order.updatedAt.toISOString()}
              transportProvider={transportProvider}
            />
          </CardContent>
        </Card>

        {/* Order details */}
        <Card className="bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base font-medium text-[#1c3a13]">Order Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              {order.listing.images?.[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={order.listing.images[0]}
                  alt={order.listing.cropType}
                  className="h-14 w-14 rounded-lg object-cover flex-shrink-0"
                />
              ) : (
                <div
                  className={`h-14 w-14 rounded-lg flex items-center justify-center flex-shrink-0 text-2xl ${
                    (CATEGORY_PLACEHOLDER[order.listing.category] ?? CATEGORY_PLACEHOLDER.VEGETABLES).bg
                  }`}
                >
                  {(CATEGORY_PLACEHOLDER[order.listing.category] ?? CATEGORY_PLACEHOLDER.VEGETABLES).emoji}
                </div>
              )}
              <div>
                <p className="font-medium text-[#1c3a13]">{order.listing.cropType}</p>
                <p className="text-sm text-[#1c3a13]/50">
                  {order.quantity} {order.listing.unit} · GHS {order.totalAmount.toFixed(2)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-[#1c3a13] flex-shrink-0" />
              <div>
                <p className="text-sm text-[#1c3a13]">{order.listing.location}</p>
                {order.transportRequest && (
                  <p className="text-xs text-[#1c3a13]/40">
                    → {order.transportRequest.deliveryLocation}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Parties */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Leaf className="h-4 w-4 text-[#1c3a13]" />
                <span className="text-xs font-medium text-[#1c3a13]/50 uppercase">Farmer</span>
              </div>
              <div className="flex items-center gap-1">
                <p className="font-medium text-sm text-[#1c3a13]">
                  {order.farmer.farmerProfile?.farmName ?? order.farmer.name}
                </p>
                <VerifiedBadge verifiedAt={order.farmer.verifiedAt?.toISOString()} size="sm" />
              </div>
              <p className="text-xs text-[#1c3a13]/50">{order.farmer.farmerProfile?.location}</p>
              {order.farmer.phone && (
                <a
                  href={`tel:${order.farmer.phone}`}
                  className="flex items-center gap-1 text-xs text-[#1c3a13] mt-1.5"
                >
                  <Phone className="h-3 w-3" />
                  {order.farmer.phone}
                </a>
              )}
            </CardContent>
          </Card>
          <Card className="bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-[#1c3a13]" />
                <span className="text-xs font-medium text-[#1c3a13]/50 uppercase">Buyer</span>
              </div>
              <div className="flex items-center gap-1">
                <p className="font-medium text-sm text-[#1c3a13]">
                  {order.buyer.buyerProfile?.businessName ?? order.buyer.name}
                </p>
                <VerifiedBadge verifiedAt={order.buyer.verifiedAt?.toISOString()} size="sm" />
              </div>
              {order.buyer.phone && (
                <a
                  href={`tel:${order.buyer.phone}`}
                  className="flex items-center gap-1 text-xs text-[#1c3a13] mt-1.5"
                >
                  <Phone className="h-3 w-3" />
                  {order.buyer.phone}
                </a>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Transport */}
        {order.transportRequest && (
          <Card className="bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-[#1c3a13]/50 uppercase">Logistics</span>
              </div>
              {transportProvider ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm text-[#1c3a13]">{transportProvider.name}</p>
                    <p className="text-xs text-[#1c3a13]/50">
                      {transportProvider.vehicleType.replace(/_/g, " ")}
                    </p>
                    <p className="text-xs text-[#1c3a13]/40">
                      Scheduled: {formatDate(order.transportRequest.scheduledDate)}
                    </p>
                  </div>
                  {transportProvider.phone && (
                    <a
                      href={`tel:${transportProvider.phone}`}
                      className="text-[#1c3a13] text-xs flex items-center gap-1"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      Call
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-sm text-[#1c3a13]/50">Searching for a transport provider...</p>
              )}

              {order.transportRequest.legs.length > 1 && (
                <div className="mt-3 pt-3 border-t border-[#eeeee9]">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-[#1c3a13]/50 uppercase mb-1.5">
                    <Route className="h-3 w-3" />
                    Relayed by {order.transportRequest.legs.length} riders
                  </p>
                  <div className="flex flex-wrap items-center gap-1 text-sm text-[#1c3a13]/70">
                    {order.transportRequest.legs.map((leg, i) => (
                      <span key={leg.id} className="flex items-center gap-1">
                        {i > 0 && <span className="text-[#1c3a13]/30">→</span>}
                        <span className={leg.endedAt ? "" : "font-semibold text-[#1c3a13]"}>
                          {leg.provider.user.name}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {order.transportRequest.pickupLat &&
                order.transportRequest.pickupLong &&
                order.transportRequest.deliveryLat &&
                order.transportRequest.deliveryLong && (
                  <div className="mt-3 pt-3 border-t border-[#eeeee9]">
                    {["ASSIGNED", "PICKED_UP", "IN_TRANSIT"].includes(order.transportRequest.status) ? (
                      <LiveRiderTracker
                        orderId={orderId}
                        pickup={{
                          lat: order.transportRequest.pickupLat,
                          lng: order.transportRequest.pickupLong,
                          label: order.transportRequest.pickupLocation,
                        }}
                        delivery={{
                          lat: order.transportRequest.deliveryLat,
                          lng: order.transportRequest.deliveryLong,
                          label: order.transportRequest.deliveryLocation,
                        }}
                      />
                    ) : (
                      <DeliveryMap
                        pickup={{
                          lat: order.transportRequest.pickupLat,
                          lng: order.transportRequest.pickupLong,
                          label: order.transportRequest.pickupLocation,
                        }}
                        delivery={{
                          lat: order.transportRequest.deliveryLat,
                          lng: order.transportRequest.deliveryLong,
                          label: order.transportRequest.deliveryLocation,
                        }}
                        height={220}
                      />
                    )}
                  </div>
                )}
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-[#1c3a13]/40 pb-4">
          Lorgric · Northern Savannah Zone, Ghana
        </p>
      </div>
    </div>
  );
}
