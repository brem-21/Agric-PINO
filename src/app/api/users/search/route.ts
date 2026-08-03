import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const id = searchParams.get("id");

  if (id) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        image: true,
        role: true,
        farmerProfile: { select: { farmName: true } },
        storageFacilityProfile: { select: { name: true } },
        buyerProfile: { select: { businessName: true } },
      },
    });
    return NextResponse.json({ user });
  }

  if (q.length < 1) return NextResponse.json({ users: [] });

  const users = await prisma.user.findMany({
    where: {
      id: { not: session.user.id },
      role: { not: "LOGISTICS" },
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
      ],
    },
    select: {
      id: true,
      name: true,
      image: true,
      role: true,
      farmerProfile: { select: { farmName: true } },
      storageFacilityProfile: { select: { name: true } },
      buyerProfile: { select: { businessName: true } },
    },
    take: 8,
  });

  return NextResponse.json({ users });
}
