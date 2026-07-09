import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20"));

  const where = { ...(status && { status: status as never }) };

  const [requests, total] = await Promise.all([
    prisma.adminRequest.findMany({
      where,
      select: {
        id: true,
        ghanaCardNumber: true,
        ghanaCardName: true,
        idPhotoFront: true,
        idPhotoBack: true,
        status: true,
        reviewNotes: true,
        reviewedAt: true,
        createdAt: true,
        user: { select: { id: true, name: true, phone: true, image: true } },
        reviewedBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.adminRequest.count({ where }),
  ]);

  return NextResponse.json({
    data: requests,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}
