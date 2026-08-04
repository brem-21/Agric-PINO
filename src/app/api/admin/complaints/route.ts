import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  const canModerate = !!session && (session.user.role === "ADMIN" || session.user.isIncidentTeam);
  if (!canModerate) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const assignment = searchParams.get("assignment"); // "unassigned" | "mine"
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20"));

  const where = {
    ...(status && { status: status as never }),
    ...(assignment === "unassigned" && { assignedToId: null }),
    ...(assignment === "mine" && { assignedToId: session!.user.id }),
  };

  const [complaints, total] = await Promise.all([
    prisma.complaint.findMany({
      where,
      include: {
        reporter: { select: { id: true, name: true, phone: true, role: true, image: true } },
        target: { select: { id: true, name: true, phone: true, role: true } },
        assignedTo: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.complaint.count({ where }),
  ]);

  return NextResponse.json({
    data: complaints,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}
