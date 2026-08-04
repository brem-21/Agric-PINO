import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrGenerateFarmerLossTips } from "@/lib/ai-insights";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ farmerId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "STORAGE_FACILITY") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const facility = await prisma.storageFacilityProfile.findUnique({ where: { userId: session.user.id } });
  if (!facility) return NextResponse.json({ error: "Facility profile not found" }, { status: 400 });

  const { farmerId } = await params;

  const relationship = await prisma.storageBooking.findFirst({
    where: { facilityId: facility.id, farmerId, status: { in: ["CONFIRMED", "DROPPED_OFF"] } },
  });
  if (!relationship) {
    return NextResponse.json({ error: "This farmer is not a customer of your facility" }, { status: 403 });
  }

  const force = new URL(req.url).searchParams.get("force") === "true";

  try {
    const tip = await getOrGenerateFarmerLossTips(farmerId, { facilityId: facility.id, force });
    return NextResponse.json(tip);
  } catch {
    return NextResponse.json({ error: "Failed to generate tips" }, { status: 500 });
  }
}
