import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Drives the marketplace category filter off what's actually listed, rather
// than the full static ProduceCategory enum — a category with zero active
// listings shouldn't show up as a selectable filter.
export async function GET() {
  const rows = await prisma.produceListing.findMany({
    where: { status: "ACTIVE", approvalStatus: "APPROVED" },
    select: { category: true },
    distinct: ["category"],
  });

  return NextResponse.json({ categories: rows.map((r) => r.category) });
}
