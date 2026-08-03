import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [
    farmerCount,
    buyerCount,
    logisticsCount,
    storageFacilityCount,
    pendingListings,
    pendingFacilities,
    openComplaints,
    totalListings,
    totalOrders,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "FARMER" } }),
    prisma.user.count({ where: { role: "BUYER" } }),
    prisma.user.count({ where: { role: "LOGISTICS" } }),
    prisma.user.count({ where: { role: "STORAGE_FACILITY" } }),
    prisma.produceListing.count({ where: { approvalStatus: "PENDING" } }),
    prisma.storageFacilityProfile.count({ where: { approvalStatus: "PENDING" } }),
    prisma.complaint.count({ where: { status: "OPEN" } }),
    prisma.produceListing.count(),
    prisma.order.count(),
  ]);

  return NextResponse.json({
    totalUsers: farmerCount + buyerCount + logisticsCount + storageFacilityCount,
    usersByRole: { FARMER: farmerCount, BUYER: buyerCount, LOGISTICS: logisticsCount, STORAGE_FACILITY: storageFacilityCount },
    pendingListings,
    pendingFacilities,
    openComplaints,
    totalListings,
    totalOrders,
  });
}
