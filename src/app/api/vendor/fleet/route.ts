import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import type { VendorVehicleType } from "@prisma/client";

const vehicleSchema = z.object({
  vehicleType: z.string(),
  licensePlate: z.string().optional(),
  driverName: z.string().optional(),
  driverPhone: z.string().optional(),
  capacity: z.number().optional(),
});

const patchSchema = z.object({
  vehicleId: z.string(),
  isAvailable: z.boolean().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  offline: z.boolean().optional(),
});

async function requireVendor(userId: string) {
  return prisma.vendorProfile.findUnique({ where: { userId } });
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vendor = await requireVendor(session.user.id);
  if (!vendor) return NextResponse.json({ error: "Vendor profile not found" }, { status: 404 });

  const vehicles = await prisma.vendorVehicle.findMany({
    where: { vendorId: vendor.id },
    include: { deliveries: { take: 1, orderBy: { createdAt: "desc" } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ vehicles });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vendor = await requireVendor(session.user.id);
  if (!vendor) return NextResponse.json({ error: "Vendor profile not found" }, { status: 404 });

  try {
    const body = await req.json();
    const data = vehicleSchema.parse(body);

    const vehicle = await prisma.vendorVehicle.create({
      data: {
        vendorId: vendor.id,
        vehicleType: data.vehicleType as VendorVehicleType,
        licensePlate: data.licensePlate,
        driverName: data.driverName,
        driverPhone: data.driverPhone,
        capacity: data.capacity,
      },
    });

    return NextResponse.json({ vehicle }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to add vehicle" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vendor = await requireVendor(session.user.id);
  if (!vendor) return NextResponse.json({ error: "Vendor profile not found" }, { status: 404 });

  try {
    const body = await req.json();
    const { vehicleId, offline, ...rest } = patchSchema.parse(body);

    const existing = await prisma.vendorVehicle.findUnique({ where: { id: vehicleId } });
    if (!existing || existing.vendorId !== vendor.id) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    const updateData = offline
      ? { lastSeen: null }
      : { ...rest, lastSeen: new Date() };

    const vehicle = await prisma.vendorVehicle.update({
      where: { id: vehicleId },
      data: updateData,
    });

    return NextResponse.json({ vehicle });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update vehicle" }, { status: 500 });
  }
}
