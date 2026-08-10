import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { isCropAllowedForCategory } from "@/lib/utils";

const updateSchema = z.object({
  cropType: z.string().min(1).optional(),
  category: z.enum(["VEGETABLES", "TUBERS", "FRUITS"]).optional(),
  quantity: z.number().positive().max(1_000_000, "Quantity seems unrealistically high").optional(),
  unit: z.string().min(1).optional(),
  pricePerUnit: z.number().positive().max(100_000, "Price per unit seems unrealistically high").optional(),
  description: z.string().optional().nullable(),
  images: z.array(z.string()).optional(),
  harvestDate: z.string().optional().nullable(),
  expiryDate: z.string().optional().nullable(),
  location: z.string().min(1).optional(),
  status: z.enum(["ACTIVE", "DRAFT"]).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const listing = await prisma.produceListing.findUnique({
    where: { id },
    include: {
      farmer: {
        select: {
          id: true,
          name: true,
          image: true,
          region: true,
          district: true,
          farmerProfile: {
            select: {
              farmName: true,
              farmSize: true,
              description: true,
              location: true,
              rating: true,
              totalRatings: true,
              acceptsCOD: true,
            },
          },
        },
      },
      storageFacility: {
        select: { id: true, name: true, location: true, storageTypes: true },
      },
    },
  });

  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  return NextResponse.json({ listing });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "FARMER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.produceListing.findUnique({ where: { id } });
  if (!existing || existing.farmerId !== session.user.id) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const data = updateSchema.parse(body);

    // Only enforce the crop/category scope when one of them is actually being
    // changed — an unrelated edit (price, quantity...) on a listing that
    // predates this restriction shouldn't get blocked by it.
    if (data.category !== undefined || data.cropType !== undefined) {
      const mergedCategory = data.category ?? existing.category;
      const mergedCropType = data.cropType ?? existing.cropType;
      if (!isCropAllowedForCategory(mergedCategory, mergedCropType)) {
        return NextResponse.json(
          { error: `${mergedCategory} listings are limited to Tomato (Vegetables) or Yam (Tubers) right now — Fruits can be any crop.` },
          { status: 400 }
        );
      }
    }

    const listing = await prisma.produceListing.update({
      where: { id },
      data: {
        ...data,
        harvestDate: data.harvestDate ? new Date(data.harvestDate) : data.harvestDate === null ? null : undefined,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : data.expiryDate === null ? null : undefined,
      },
    });

    return NextResponse.json({ listing });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update listing" }, { status: 500 });
  }
}
