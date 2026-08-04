import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export type DeliveryUnitCategory = "RIDER";

export interface DeliveryUnit {
  id: string;
  category: DeliveryUnitCategory;
  vehicleType: string;
  name: string;
  phone: string | null;
  companyName: string | null;
  licensePlate: string | null;
  capacity: number | null;
  rating: number | null;
  totalRatings: number | null;
  lastSeen: string | null;
  latitude: number | null;
  longitude: number | null;
  isVerified: boolean;
}

function statusOrder(lastSeen: Date | null): number {
  if (!lastSeen) return 2;
  const diffMs = Date.now() - lastSeen.getTime();
  if (diffMs < 2 * 60 * 1000) return 0;
  if (diffMs < 5 * 60 * 1000) return 1;
  return 2;
}

export async function GET() {
  const profiles = await prisma.logisticsProfile.findMany({
    where: { isAvailable: true },
    include: {
      user: {
        select: {
          name: true,
          phone: true,
          lastSeen: true,
          latitude: true,
          longitude: true,
          isVerified: true,
        },
      },
    },
  });

  const riders: DeliveryUnit[] = profiles.map((p) => ({
    id: p.id,
    category: "RIDER",
    vehicleType: p.vehicleType,
    name: p.user.name,
    phone: p.user.phone,
    companyName: p.companyName ?? null,
    licensePlate: p.licensePlate ?? null,
    capacity: p.vehicleCapacity ?? null,
    rating: p.rating,
    totalRatings: p.totalRatings,
    lastSeen: p.user.lastSeen?.toISOString() ?? null,
    latitude: p.user.latitude ?? null,
    longitude: p.user.longitude ?? null,
    isVerified: p.user.isVerified,
  }));

  const all = riders.sort(
    (a, b) =>
      statusOrder(a.lastSeen ? new Date(a.lastSeen) : null) -
      statusOrder(b.lastSeen ? new Date(b.lastSeen) : null)
  );

  return NextResponse.json({ units: all });
}
