import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { latitude, longitude, offline } = body as {
    latitude?: unknown;
    longitude?: unknown;
    offline?: unknown;
  };

  if (offline === true) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { lastSeen: null },
    });
    return NextResponse.json({ ok: true });
  }

  const data: Record<string, unknown> = { lastSeen: new Date() };
  if (typeof latitude === "number" && typeof longitude === "number") {
    data.latitude = latitude;
    data.longitude = longitude;
  }

  await prisma.user.update({ where: { id: session.user.id }, data });

  return NextResponse.json({ ok: true });
}
