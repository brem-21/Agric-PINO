import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const facilities = await prisma.storageFacilityProfile.findMany({
    where: { approvalStatus: "APPROVED" },
    select: {
      id: true,
      name: true,
      description: true,
      location: true,
      latitude: true,
      longitude: true,
      storageTypes: true,
      capacityTonnes: true,
      acceptedCategories: true,
      operatingHours: true,
      rating: true,
      totalRatings: true,
    },
  });

  return NextResponse.json({ facilities });
}
