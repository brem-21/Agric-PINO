import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const facility = await prisma.storageFacilityProfile.findUnique({ where: { userId: session.user.id } });
  if (!facility) return NextResponse.json({ error: "Facility profile not found" }, { status: 404 });

  const [commissionAgg, activeListings, bookingCounts] = await Promise.all([
    prisma.order.aggregate({
      where: { storageFacilityId: facility.id, paymentStatus: "PAID" },
      _sum: { facilityCommissionAmount: true, totalAmount: true },
    }),
    prisma.produceListing.count({ where: { storageFacilityId: facility.id, status: "ACTIVE" } }),
    prisma.storageBooking.groupBy({
      by: ["status"],
      where: { facilityId: facility.id },
      _count: true,
    }),
  ]);

  const countByStatus = Object.fromEntries(bookingCounts.map((b) => [b.status, b._count]));

  return NextResponse.json({
    analytics: {
      totalCommissionEarnings: commissionAgg._sum.facilityCommissionAmount ?? 0,
      totalSalesFacilitated: commissionAgg._sum.totalAmount ?? 0,
      activeListings,
      pendingBookings: countByStatus.PENDING ?? 0,
      confirmedBookings: countByStatus.CONFIRMED ?? 0,
      inStorageBookings: countByStatus.DROPPED_OFF ?? 0,
    },
  });
}
