import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrGenerateFacilityPractices } from "@/lib/ai-insights";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "STORAGE_FACILITY") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const facility = await prisma.storageFacilityProfile.findUnique({ where: { userId: session.user.id } });
  if (!facility) return NextResponse.json({ error: "Facility profile not found" }, { status: 400 });

  try {
    const tip = await getOrGenerateFacilityPractices(facility.id);
    return NextResponse.json(tip);
  } catch {
    return NextResponse.json({ error: "Failed to generate tips" }, { status: 500 });
  }
}

export async function POST() {
  const session = await auth();
  if (!session || session.user.role !== "STORAGE_FACILITY") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const facility = await prisma.storageFacilityProfile.findUnique({ where: { userId: session.user.id } });
  if (!facility) return NextResponse.json({ error: "Facility profile not found" }, { status: 400 });

  try {
    const tip = await getOrGenerateFacilityPractices(facility.id, { force: true });
    return NextResponse.json(tip);
  } catch {
    return NextResponse.json({ error: "Failed to generate tips" }, { status: 500 });
  }
}
