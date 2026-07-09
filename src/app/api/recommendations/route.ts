import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateRecommendation } from "@/lib/openrouter";
import { sendRecommendationSMS } from "@/lib/mnotify";
import { haversineDistance } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "BUYER") {
    return NextResponse.json({ error: "Only buyers can receive recommendations" }, { status: 401 });
  }

  const { lat, lon, sendSMS: doSendSMS } = await req.json();

  const buyer = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      buyerOrders: {
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          listing: {
            select: {
              cropType: true,
              quantity: true,
              unit: true,
              location: true,
              latitude: true,
              longitude: true,
            },
          },
        },
      },
    },
  });

  if (!buyer) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Get active listings with distance if coordinates provided
  const listings = await prisma.produceListing.findMany({
    where: { status: "ACTIVE" },
    include: {
      farmer: {
        select: { name: true, farmerProfile: { select: { farmName: true, location: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const enrichedListings = listings.map((l) => ({
    cropType: l.cropType,
    farmerName: l.farmer.farmerProfile?.farmName ?? l.farmer.name,
    location: l.location,
    pricePerUnit: l.pricePerUnit,
    unit: l.unit,
    quantity: l.quantity,
    distanceKm:
      lat && lon && l.latitude && l.longitude
        ? haversineDistance(lat, lon, l.latitude, l.longitude)
        : undefined,
  }));

  // Sort by distance if available
  if (lat && lon) {
    enrichedListings.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
  }

  const purchaseHistory = buyer.buyerOrders.map((o) => ({
    cropType: o.listing.cropType,
    quantity: o.listing.quantity,
    unit: o.listing.unit,
    farmerLocation: o.listing.location,
  }));

  const message = await generateRecommendation({
    buyerName: buyer.name,
    buyerRegion: buyer.region ?? "Northern Ghana",
    purchaseHistory,
    availableListings: enrichedListings,
  });

  if (doSendSMS && buyer.phone) {
    await sendRecommendationSMS({
      phone: buyer.phone,
      buyerName: buyer.name.split(" ")[0],
      message,
    });
  }

  return NextResponse.json({
    message,
    smsSent: doSendSMS && !!buyer.phone,
    listings: enrichedListings.slice(0, 6),
  });
}
