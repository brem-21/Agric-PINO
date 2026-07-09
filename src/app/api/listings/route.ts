import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import type { ProduceCategory, ListingStatus } from "@prisma/client";

const listingSchema = z.object({
  cropType: z.string().min(1),
  category: z.enum(["VEGETABLES", "GRAINS", "TUBERS", "FRUITS", "LEGUMES", "LIVESTOCK"]),
  quantity: z.number().positive().max(1_000_000, "Quantity seems unrealistically high"),
  unit: z.string().min(1),
  pricePerUnit: z.number().positive().max(100_000, "Price per unit seems unrealistically high"),
  description: z.string().optional(),
  images: z.array(z.string()).optional(),
  harvestDate: z.string().optional(),
  expiryDate: z.string().optional(),
  location: z.string().min(1),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") as ProduceCategory | null;
  const search = searchParams.get("search");
  const region = searchParams.get("region");
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");
  const farmerId = searchParams.get("farmerId");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "12");

  const where = {
    status: "ACTIVE" as ListingStatus,
    approvalStatus: "APPROVED" as never,
    ...(farmerId && { farmerId }),
    ...(category && { category }),
    ...(search && {
      OR: [
        { cropType: { contains: search, mode: "insensitive" as const } },
        { description: { contains: search, mode: "insensitive" as const } },
        { location: { contains: search, mode: "insensitive" as const } },
      ],
    }),
    ...(region && { location: { contains: region, mode: "insensitive" as const } }),
    ...(minPrice && { pricePerUnit: { gte: parseFloat(minPrice) } }),
    ...(maxPrice && { pricePerUnit: { lte: parseFloat(maxPrice) } }),
  };

  const [listings, total] = await Promise.all([
    prisma.produceListing.findMany({
      where,
      include: {
        farmer: {
          select: {
            id: true,
            name: true,
            image: true,
            region: true,
            farmerProfile: {
              select: { farmName: true, rating: true, location: true, acceptsCOD: true },
            },
          },
        },
      },
      orderBy: { sequence: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.produceListing.count({ where }),
  ]);

  return NextResponse.json({
    listings,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "FARMER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.user.isVerified) {
    return NextResponse.json(
      { error: "Verify your account before creating listings" },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const data = listingSchema.parse(body);

    const listing = await prisma.produceListing.create({
      data: {
        ...data,
        farmerId: session.user.id,
        images: data.images ?? [],
        harvestDate: data.harvestDate ? new Date(data.harvestDate) : undefined,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
      },
    });

    // Notify followers + admins
    const [followerIds, adminIds] = await Promise.all([
      prisma.follow.findMany({ where: { followingId: session.user.id }, select: { followerId: true } }),
      prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } }),
    ]);

    const notifRecipients = [
      ...followerIds.map((f) => ({ id: f.followerId, isAdmin: false })),
      ...adminIds.map((a) => ({ id: a.id, isAdmin: true })),
    ].filter((r, i, arr) => arr.findIndex((x) => x.id === r.id) === i); // dedup

    if (notifRecipients.length > 0) {
      await prisma.notification.createMany({
        data: notifRecipients.map(({ id, isAdmin }) => ({
          userId: id,
          actorId: session.user.id,
          type: "NEW_LISTING",
          title: isAdmin
            ? `New listing awaiting approval from ${session.user.name ?? "a farmer"}`
            : `New listing from ${session.user.name ?? "a farmer"}`,
          body: `${listing.cropType} — ${listing.quantity} ${listing.unit} at GHS ${listing.pricePerUnit}/${listing.unit}`,
          link: isAdmin ? `/admin/listings` : `/marketplace/${listing.id}`,
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
