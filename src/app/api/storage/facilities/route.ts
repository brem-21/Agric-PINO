import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const location = searchParams.get("location");
  const category = searchParams.get("category");

  const facilities = await prisma.storageFacilityProfile.findMany({
    where: {
      approvalStatus: "APPROVED",
      ...(location && { location: { contains: location, mode: "insensitive" } }),
      ...(category && { acceptedCategories: { has: category as never } }),
    },
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
      equipment: true,
      operatingHours: true,
      rating: true,
      totalRatings: true,
    },
  });

  return NextResponse.json({ facilities });
}
