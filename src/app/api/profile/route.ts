import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";

const patchSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(10, "Valid Ghana phone number required"),
  region: z.string().min(1, "Region is required"),
  district: z.string().optional(),
  ghanaCardNumber: z.string().min(8).optional(),
  ghanaCardName: z.string().min(2).optional(),
  residenceLocation: z.string().min(2).optional(),
  // Farmer-specific
  farmName: z.string().min(1).optional(),
  farmSize: z.number().positive().optional(),
  farmLocation: z.string().min(1).optional(),
  farmDescription: z.string().optional(),
  acceptsCOD: z.boolean().optional(),
  // Buyer-specific
  businessName: z.string().optional(),
  businessType: z.enum(["WHOLESALER", "RETAILER", "RESTAURANT", "PROCESSOR", "EXPORTER", "HOUSEHOLD"]).optional(),
  buyerDescription: z.string().optional(),
  // Logistics-specific
  companyName: z.string().optional(),
  licensePlate: z.string().optional(),
  vehicleType: z.enum(["MOTORBIKE", "TRUCK"]).optional(),
  vehicleCapacity: z.number().positive().optional(),
  // Storage facility-specific
  facilityName: z.string().min(1).optional(),
  facilityLocation: z.string().min(1).optional(),
  facilityDescription: z.string().optional(),
  operatingHours: z.string().optional(),
  capacityTonnes: z.number().positive().optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const data = parsed.data;

  const existing = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, isVerified: true },
  });
  if (!existing) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Identity fields are locked once verified — proven data shouldn't be
  // silently overwritten by a self-edit. Changing them requires a fresh
  // verification request instead.
  const userData: Prisma.UserUpdateInput = {
    name: data.name,
    phone: data.phone,
    region: data.region,
    district: data.district,
  };
  if (!existing.isVerified) {
    if (data.ghanaCardNumber !== undefined) userData.ghanaCardNumber = data.ghanaCardNumber;
    if (data.ghanaCardName !== undefined) userData.ghanaCardName = data.ghanaCardName;
    if (data.residenceLocation !== undefined) userData.residenceLocation = data.residenceLocation;
  }

  try {
    const user = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: session.user.id },
        data: userData,
        include: {
          farmerProfile: true,
          buyerProfile: true,
          logisticsProfile: true,
          storageFacilityProfile: true,
        },
      });

      if (existing.role === "FARMER" && updated.farmerProfile) {
        await tx.farmerProfile.update({
          where: { userId: session.user.id },
          data: {
            farmName: data.farmName,
            farmSize: data.farmSize,
            location: data.farmLocation,
            description: data.farmDescription,
            acceptsCOD: data.acceptsCOD,
          },
        });
      } else if (existing.role === "BUYER" && updated.buyerProfile) {
        await tx.buyerProfile.update({
          where: { userId: session.user.id },
          data: {
            businessName: data.businessName,
            businessType: data.businessType,
            description: data.buyerDescription,
          },
        });
      } else if (existing.role === "LOGISTICS" && updated.logisticsProfile) {
        await tx.logisticsProfile.update({
          where: { userId: session.user.id },
          data: {
            companyName: data.companyName,
            licensePlate: data.licensePlate,
            vehicleType: data.vehicleType,
            vehicleCapacity: data.vehicleCapacity,
          },
        });
      } else if (existing.role === "STORAGE_FACILITY" && updated.storageFacilityProfile) {
        await tx.storageFacilityProfile.update({
          where: { userId: session.user.id },
          data: {
            name: data.facilityName,
            location: data.facilityLocation,
            description: data.facilityDescription,
            operatingHours: data.operatingHours,
            capacityTonnes: data.capacityTonnes,
          },
        });
      }

      return tx.user.findUnique({
        where: { id: session.user.id },
        include: {
          farmerProfile: true,
          buyerProfile: true,
          logisticsProfile: true,
          storageFacilityProfile: true,
        },
      });
    });

    return NextResponse.json({ data: user });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = (error.meta?.target as string[] | undefined)?.join(", ") ?? "";
      const field = target.includes("phone") ? "This phone number" : target.includes("ghanaCardNumber") ? "This Ghana Card number" : "This value";
      return NextResponse.json({ error: `${field} is already in use by another account` }, { status: 409 });
    }
    console.error("Profile update error:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
