import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const facility = await prisma.storageFacilityProfile.findUnique({
    where: { id, approvalStatus: "APPROVED" },
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

  if (!facility) return NextResponse.json({ error: "Facility not found" }, { status: 404 });
  return NextResponse.json({ facility });
}
