import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeLossPercentage } from "@/lib/post-harvest-loss";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ farmerId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "STORAGE_FACILITY") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const facility = await prisma.storageFacilityProfile.findUnique({ where: { userId: session.user.id } });
  if (!facility) return NextResponse.json({ error: "Facility profile not found" }, { status: 400 });

  const { farmerId } = await params;

  const relationship = await prisma.storageBooking.findFirst({
    where: { facilityId: facility.id, farmerId, status: { in: ["CONFIRMED", "DROPPED_OFF"] } },
  });
  if (!relationship) {
    return NextResponse.json({ error: "This farmer is not a customer of your facility" }, { status: 403 });
  }

  const [farmer, listings, bookings] = await Promise.all([
    prisma.user.findUnique({
      where: { id: farmerId },
      select: {
        id: true, name: true, phone: true, region: true, district: true,
        farmerProfile: { select: { farmName: true, farmSize: true, location: true, rating: true, totalRatings: true, description: true } },
      },
    }),
    prisma.produceListing.findMany({
      where: { farmerId, storageFacilityId: facility.id },
      orderBy: { createdAt: "desc" },
      include: { orders: { select: { quantity: true } } },
    }),
    prisma.storageBooking.findMany({
      where: { farmerId, facilityId: facility.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!farmer) return NextResponse.json({ error: "Farmer not found" }, { status: 404 });

  const inStockValue = listings
    .filter((l) => l.status === "ACTIVE")
    .reduce((sum, l) => sum + l.quantity * l.pricePerUnit, 0);

  const lossPercentageThisMonth = computeLossPercentage(listings, { monthOnly: true });
  const lossPercentageAllTime = computeLossPercentage(listings);

  return NextResponse.json({
    farmer,
    listings,
    bookings,
    inStockValue,
    lossPercentageThisMonth,
    lossPercentageAllTime,
  });
}
