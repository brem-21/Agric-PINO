import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role");
  const search = searchParams.get("search");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20"));

  const where = {
    ...(role && { role: role as never }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" as const } },
        { phone: { contains: search } },
        { email: { contains: search, mode: "insensitive" as const } },
        { ghanaCardNumber: { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        image: true,
        role: true,
        region: true,
        district: true,
        isActive: true,
        isVerified: true,
        verifiedAt: true,
        ghanaCardNumber: true,
        ghanaCardName: true,
        residenceLocation: true,
        createdAt: true,
        lastSeen: true,
        farmerProfile: { select: { farmName: true, rating: true, totalRatings: true, location: true } },
        buyerProfile: { select: { businessName: true, rating: true, totalRatings: true } },
        logisticsProfile: { select: { companyName: true, rating: true, totalRatings: true, isAvailable: true } },
        storageFacilityProfile: { select: { name: true, rating: true, totalRatings: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({
    data: users,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}
