import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeLossPercentage } from "@/lib/post-harvest-loss";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "STORAGE_FACILITY") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const facility = await prisma.storageFacilityProfile.findUnique({ where: { userId: session.user.id } });
  if (!facility) return NextResponse.json({ customers: [] });

  const bookingFarmers = await prisma.storageBooking.findMany({
    where: { facilityId: facility.id, status: { in: ["CONFIRMED", "DROPPED_OFF"] } },
    select: { farmerId: true },
    distinct: ["farmerId"],
  });
  const farmerIds = bookingFarmers.map((b) => b.farmerId);

  if (farmerIds.length === 0) return NextResponse.json({ customers: [] });

  const farmers = await prisma.user.findMany({
    where: { id: { in: farmerIds } },
    select: {
      id: true,
      name: true,
      phone: true,
      region: true,
      district: true,
      farmerProfile: { select: { farmName: true, location: true } },
    },
  });

  const customers = await Promise.all(
    farmers.map(async (farmer) => {
      const listings = await prisma.produceListing.findMany({
        where: { farmerId: farmer.id, storageFacilityId: facility.id },
        select: {
          status: true,
          quantity: true,
          pricePerUnit: true,
          expiryDate: true,
          createdAt: true,
          orders: { select: { quantity: true } },
        },
      });

      const inStockValue = listings
        .filter((l) => l.status === "ACTIVE")
        .reduce((sum, l) => sum + l.quantity * l.pricePerUnit, 0);

      const lossPercentage = computeLossPercentage(listings, { monthOnly: true });

      return {
        farmer: {
          id: farmer.id,
          name: farmer.name,
          phone: farmer.phone,
          location: farmer.farmerProfile?.location ?? [farmer.district, farmer.region].filter(Boolean).join(", "),
          farmName: farmer.farmerProfile?.farmName ?? null,
        },
        inStockValue,
        activeListingCount: listings.filter((l) => l.status === "ACTIVE").length,
        lossPercentageThisMonth: lossPercentage,
      };
    })
  );

  customers.sort((a, b) => (b.lossPercentageThisMonth ?? 0) - (a.lossPercentageThisMonth ?? 0));

  return NextResponse.json({ customers });
}
