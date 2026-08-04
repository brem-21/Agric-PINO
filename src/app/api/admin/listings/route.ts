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

  const [listings, total] = await Promise.all([
    prisma.produceListing.findMany({
      where,
      select: {
        id: true,
        cropType: true,
        category: true,
        quantity: true,
        unit: true,
        pricePerUnit: true,
        currency: true,
        images: true,
        location: true,
        status: true,
        approvalStatus: true,
        approvalNotes: true,
        priceFlagged: true,
        createdAt: true,
        farmer: {
          select: {
            id: true,
            name: true,
            phone: true,
            farmerProfile: { select: { farmName: true } },
          },
        },
      },
      // Price-flagged listings surface first within a status — they're the
      // ones that most need a human's attention, not just the oldest.
      orderBy: [{ priceFlagged: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.produceListing.count({ where }),
  ]);

  return NextResponse.json({
    data: listings,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}
