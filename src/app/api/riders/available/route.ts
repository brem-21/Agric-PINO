import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
          verifiedAt: true,
        },
      },
    },
  });

  const sorted = profiles.sort(
    (a, b) => statusOrder(a.user.lastSeen) - statusOrder(b.user.lastSeen)
  );

  return NextResponse.json({ riders: sorted });
}
