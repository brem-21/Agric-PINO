import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const profileSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  location: z.string().min(1),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  storageTypes: z.array(z.enum(["COLD_CHAIN", "HERMETIC_DRY"])).min(1),
  capacityTonnes: z.number().positive().optional(),
  acceptedCategories: z
    .array(z.enum(["VEGETABLES", "GRAINS", "TUBERS", "FRUITS", "LEGUMES", "LIVESTOCK"]))
    .min(1),
  operatingHours: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const facility = await prisma.storageFacilityProfile.findUnique({ where: { userId: session.user.id } });
  return NextResponse.json({ facility });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "STORAGE_FACILITY") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = profileSchema.parse(await req.json());

    // A moderated field (location) changing re-triggers admin review, mirroring
    // how a listing edit doesn't silently keep its old approval — a facility
    // that relocates needs to be re-vetted before it shows up on the map again.
    const existing = await prisma.storageFacilityProfile.findUnique({ where: { userId: session.user.id } });
    const locationChanged = existing && (existing.location !== data.location);

    const facility = await prisma.storageFacilityProfile.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, ...data },
      update: { ...data, ...(locationChanged && { approvalStatus: "PENDING" }) },
    });

    return NextResponse.json({ facility });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to save facility profile" }, { status: 500 });
  }
}
