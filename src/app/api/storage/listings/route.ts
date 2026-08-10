import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const facilityListingSchema = z.object({
  farmerId: z.string(),
  cropType: z.string().min(1),
  category: z.enum(["VEGETABLES", "TUBERS", "FRUITS"]),
  quantity: z.number().positive().max(1_000_000, "Quantity seems unrealistically high"),
  unit: z.string().min(1),
  pricePerUnit: z.number().positive().max(100_000, "Price per unit seems unrealistically high"),
  description: z.string().optional(),
  images: z.array(z.string()).optional(),
  harvestDate: z.string().optional(),
  expiryDate: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "STORAGE_FACILITY") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const facility = await prisma.storageFacilityProfile.findUnique({ where: { userId: session.user.id } });
  if (!facility) {
    return NextResponse.json({ error: "Facility profile not found" }, { status: 400 });
  }

  try {
    const data = facilityListingSchema.parse(await req.json());

    // Only allow listing on behalf of a farmer with an established
    // relationship — a confirmed or already-dropped-off booking at this
    // facility — never an arbitrary farmer.
    const relationship = await prisma.storageBooking.findFirst({
      where: { facilityId: facility.id, farmerId: data.farmerId, status: { in: ["CONFIRMED", "DROPPED_OFF"] } },
    });
    if (!relationship) {
      return NextResponse.json(
        { error: "This farmer has no confirmed booking at your facility" },
        { status: 403 }
      );
    }

    const listing = await prisma.produceListing.create({
      data: {
        cropType: data.cropType,
        category: data.category,
        quantity: data.quantity,
        unit: data.unit,
        pricePerUnit: data.pricePerUnit,
        description: data.description,
        images: data.images ?? [],
        harvestDate: data.harvestDate ? new Date(data.harvestDate) : undefined,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
        farmerId: data.farmerId,
        storageFacilityId: facility.id,
        location: facility.location,
        latitude: facility.latitude,
        longitude: facility.longitude,
      },
    });

    const [farmer, admins] = await Promise.all([
      prisma.user.findUnique({ where: { id: data.farmerId }, select: { id: true, name: true } }),
      prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } }),
    ]);

    const notifRecipients = [
      ...(farmer ? [{ id: farmer.id, link: `/marketplace/${listing.id}`, title: `${facility.name} listed produce on your behalf: ${listing.cropType}` }] : []),
      ...admins.map((a) => ({ id: a.id, link: "/admin/listings", title: `New listing awaiting approval from ${facility.name} (on behalf of ${farmer?.name ?? "a farmer"})` })),
    ];

    if (notifRecipients.length > 0) {
      await prisma.notification.createMany({
        data: notifRecipients.map((r) => ({
          userId: r.id,
          actorId: session.user.id,
          type: "NEW_LISTING",
          title: r.title,
          body: `${listing.cropType} — ${listing.quantity} ${listing.unit} at GHS ${listing.pricePerUnit}/${listing.unit}`,
          link: r.link,
          entityId: listing.id,
        })),
      });
    }

    return NextResponse.json({ listing }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create listing" }, { status: 500 });
  }
}
