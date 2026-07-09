import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const search = searchParams.get("q");

  const products = await prisma.vendorProduct.findMany({
    where: {
      isAvailable: true,
      ...(category && { category: category as never }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ],
      }),
    },
    include: {
      vendor: { select: { id: true, userId: true, shopName: true, location: true, rating: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ products });
}
