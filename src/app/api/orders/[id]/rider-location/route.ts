import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateFare, haversineDistance } from "@/lib/utils";

// Public — mirrors the tracking page itself (no auth() check there either;
// it's designed to be a shareable link/printed waybill), so this only ever
// returns a rider's position while they're actively on a job for this order,
// never a standing location.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const request = await prisma.transportRequest.findUnique({
    where: { orderId: id },
    select: {
      status: true,
      pickupLat: true,
      pickupLong: true,
      deliveryLat: true,
      deliveryLong: true,
      provider: {
        select: {
          user: { select: { latitude: true, longitude: true, lastSeen: true, name: true } },
        },
      },
    },
  });

  const isActive = request && ["ASSIGNED", "PICKED_UP", "IN_TRANSIT"].includes(request.status);
  const rider = request?.provider?.user;
  if (!isActive || !rider?.latitude || !rider?.longitude) {
    return NextResponse.json({ active: false });
  }

  // En route to pickup vs. already carrying the goods — ETA should point at
  // whichever leg the rider is actually on.
  const target =
    request.status === "ASSIGNED"
      ? { lat: request.pickupLat, lng: request.pickupLong }
      : { lat: request.deliveryLat, lng: request.deliveryLong };

  let etaMinutes: number | null = null;
  let distanceKm: number | null = null;
  if (target.lat != null && target.lng != null) {
    distanceKm = haversineDistance(rider.latitude, rider.longitude, target.lat, target.lng);
    etaMinutes = calculateFare(distanceKm, 0).etaMinutes;
  }

  return NextResponse.json({
    active: true,
    lat: rider.latitude,
    lng: rider.longitude,
    riderName: rider.name,
    lastSeen: rider.lastSeen,
    etaMinutes,
    distanceKm,
    headingTo: request.status === "ASSIGNED" ? "pickup" : "delivery",
  });
}
