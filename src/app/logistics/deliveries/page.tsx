import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Package, Phone, Clock, FileText, Route } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { HandoffDialog } from "../handoff-dialog";
import { DeliveryMap } from "@/components/shared/delivery-map";

const STATUS_BADGE: Record<string, "default" | "warning" | "success" | "destructive" | "secondary"> = {
  ASSIGNED: "default",
  PICKED_UP: "warning",
  IN_TRANSIT: "warning",
  DELIVERED: "success",
  CANCELLED: "destructive",
};

export default async function ActiveDeliveriesPage() {
  const session = await auth();
  if (!session || session.user.role !== "LOGISTICS") redirect("/auth/login");

  const profile = await prisma.logisticsProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!profile) {
    return (
      <div className="text-center py-16 text-[#1c3a13]/50">
        <p>Logistics profile not set up.</p>
      </div>
    );
  }

  const deliveries = await prisma.transportRequest.findMany({
    where: {
      providerId: profile.id,
      status: { in: ["ASSIGNED", "PICKED_UP", "IN_TRANSIT"] },
    },
    include: {
      requester: { select: { name: true, phone: true } },
      order: {
        include: {
          listing: { select: { cropType: true, category: true, images: true } },
          buyer: { select: { name: true, phone: true } },
          farmer: { select: { name: true, phone: true } },
        },
      },
      legs: {
        include: { provider: { include: { user: { select: { name: true } } } } },
        orderBy: { sequence: "asc" },
      },
    },
    orderBy: { scheduledDate: "asc" },
  });

  const CATEGORY_EMOJI: Record<string, string> = {
    VEGETABLES: "🥬", GRAINS: "🌾", TUBERS: "🍠", FRUITS: "🍎", LEGUMES: "🫘", LIVESTOCK: "🐄",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-light tracking-tight text-[#1c3a13]">Active Deliveries</h1>
        <p className="text-[#1c3a13]/50 text-sm mt-1">Your ongoing transport assignments</p>
      </div>

      {deliveries.length === 0 ? (
        <Card className="bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl">
          <CardContent className="py-16 text-center">
            <Package className="h-12 w-12 text-[#1c3a13]/40 mx-auto mb-3" />
            <p className="font-medium text-[#1c3a13]/70">No active deliveries</p>
            <p className="text-sm text-[#1c3a13]/40 mt-1">Check Transport Requests for new jobs</p>
            <Link href="/logistics/requests" className="mt-4 inline-block text-sm text-[#1c3a13] font-medium hover:underline">
              View Requests →
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {deliveries.map((delivery) => {
            const listing = delivery.order?.listing;
            const category = listing?.category ?? "VEGETABLES";
            const emoji = listing?.images?.[0] ? null : CATEGORY_EMOJI[category];

            // Inline status badge styles per spec
            const statusStyle =
              delivery.status === "IN_TRANSIT" || delivery.status === "PICKED_UP" || delivery.status === "ASSIGNED"
                ? "bg-[#eeeee9] text-[#1c3a13]"
                : delivery.status === "DELIVERED"
                  ? "bg-[#d3fa99] text-[#1c3a13]"
                  : "bg-red-100 text-red-700";

            return (
              <div key={delivery.id} className="bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl">
                {/* Header */}
                <div className="px-5 pt-5 pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl overflow-hidden flex-shrink-0 bg-[#eeeee9] flex items-center justify-center text-2xl">
                      {listing?.images?.[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={listing.images[0]} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span>{emoji}</span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-[#1c3a13]">{listing?.cropType ?? "Produce"}</p>
                      <p className="text-xs text-[#1c3a13]/40">#{delivery.id.slice(-8).toUpperCase()}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusStyle}`}>
                    {delivery.status.replace(/_/g, " ")}
                  </span>
                </div>

                {/* Body */}
                <div className="px-5 pb-5 space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-[#1c3a13]/40 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-[#1c3a13]/40">Pickup</p>
                        <p className="text-[#1c3a13]">{delivery.pickupLocation}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-[#1c3a13] mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-[#1c3a13]/40">Delivery</p>
                        <p className="text-[#1c3a13]">{delivery.deliveryLocation}</p>
                      </div>
                    </div>
                  </div>

                  {delivery.pickupLat && delivery.pickupLong && delivery.deliveryLat && delivery.deliveryLong && (
                    <DeliveryMap
                      pickup={{ lat: delivery.pickupLat, lng: delivery.pickupLong, label: delivery.pickupLocation }}
                      delivery={{ lat: delivery.deliveryLat, lng: delivery.deliveryLong, label: delivery.deliveryLocation }}
                    />
                  )}

                  <div className="flex items-center gap-4 text-sm text-[#1c3a13]/70">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{formatDate(delivery.scheduledDate)}</span>
                    </div>
                    {delivery.estimatedCost && (
                      <span className="font-medium text-[#1c3a13]">
                        Est. {formatCurrency(delivery.estimatedCost)}
                      </span>
                    )}
                  </div>

                  {delivery.order && (
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#eeeee9]">
                      <div className="flex items-center gap-1.5 text-xs text-[#1c3a13]/70">
                        <span className="font-medium">Farmer:</span>
                        <span>{delivery.order.farmer.name}</span>
                        <a href={`tel:${delivery.order.farmer.phone}`} className="text-[#1c3a13]">
                          <Phone className="h-3 w-3" />
                        </a>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-[#1c3a13]/70">
                        <span className="font-medium">Buyer:</span>
                        <span>{delivery.order.buyer.name}</span>
                        <a href={`tel:${delivery.order.buyer.phone}`} className="text-[#1c3a13]">
                          <Phone className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  )}

                  {delivery.legs.length > 1 && (
                    <div className="pt-1 border-t border-[#eeeee9]">
                      <p className="flex items-center gap-1.5 text-xs font-medium text-[#1c3a13]/70 mb-1">
                        <Route className="h-3 w-3" />
                        Rider relay ({delivery.legs.length} legs)
                      </p>
                      <div className="flex flex-wrap items-center gap-1 text-xs text-[#1c3a13]/60">
                        {delivery.legs.map((leg, i) => (
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

                  {delivery.order && (
                    <div className="flex items-center gap-3 pt-1 flex-wrap">
                      <Link
                        href={`/tracking/${delivery.order.id}`}
                        className="text-xs text-[#1c3a13] font-medium hover:underline"
                      >
                        View tracking page →
                      </Link>
                      {delivery.orderId && (
                        <Link
                          href={`/delivery/${delivery.orderId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-full border border-[#1c3a13] px-2.5 py-1 text-xs font-medium text-[#1c3a13] hover:bg-[#eeeee9] transition-colors"
                        >
                          <FileText className="h-3 w-3" />
                          Delivery Slip
                        </Link>
                      )}
                    </div>
                  )}

                  <div className="pt-1">
                    <HandoffDialog
                      requestId={delivery.id}
                      currentProviderId={profile.id}
                      cropType={delivery.order?.listing.cropType ?? "this transport"}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
