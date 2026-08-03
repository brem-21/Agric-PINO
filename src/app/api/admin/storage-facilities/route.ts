import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const approvalStatus = searchParams.get("status"); // PENDING | APPROVED | REJECTED
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20"));

  const where = {
    ...(approvalStatus && { approvalStatus: approvalStatus as never }),
  };

  const [facilities, total] = await Promise.all([
    prisma.storageFacilityProfile.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        location: true,
        storageTypes: true,
        capacityTonnes: true,
        acceptedCategories: true,
        operatingHours: true,
        approvalStatus: true,
        createdAt: true,
        user: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.storageFacilityProfile.count({ where }),
  ]);

  return NextResponse.json({
    data: facilities,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}
