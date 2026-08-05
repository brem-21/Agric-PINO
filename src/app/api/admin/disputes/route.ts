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

  const disputes = await prisma.orderDispute.findMany({
    where: status ? { status: status as never } : undefined,
    include: {
      raisedBy: { select: { id: true, name: true, phone: true } },
      resolvedBy: { select: { name: true } },
      order: {
        select: {
          id: true,
          totalAmount: true,
          paymentStatus: true,
          createdAt: true,
          listing: { select: { cropType: true, unit: true, images: true } },
          farmer: { select: { id: true, name: true, phone: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ disputes });
}
