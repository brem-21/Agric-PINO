import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { REPEAT_OFFENDER_THRESHOLD } from "@/lib/complaints";

export async function GET(req: NextRequest) {
  const session = await auth();
  const canModerate = !!session && (session.user.role === "ADMIN" || session.user.isIncidentTeam);
  if (!canModerate) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role");

  const grouped = await prisma.complaint.groupBy({
    by: ["targetUserId"],
    where: { targetUserId: { not: null } },
    _count: true,
  });

  const counts = new Map(grouped.map((g) => [g.targetUserId as string, g._count]));

  const users = await prisma.user.findMany({
    where: {
      id: { in: [...counts.keys()] },
      ...(role && { role: role as never }),
    },
    select: { id: true, name: true, phone: true, role: true },
  });

  const rows = users
    .map((u) => ({ user: u, count: counts.get(u.id) ?? 0 }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({ rows, threshold: REPEAT_OFFENDER_THRESHOLD });
}
