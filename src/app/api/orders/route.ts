import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendOrderConfirmationSMS } from "@/lib/mnotify";
import { FACILITY_COMMISSION_RATE } from "@/lib/utils";
import { z } from "zod";

const orderSchema = z.object({
  listingId: z.string(),
  quantity: z.number().positive(),
  notes: z.string().optional(),
  fulfillmentType: z.enum(["PICKUP", "DELIVERY"]).default("DELIVERY"),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const role = session.user.role;
  let scope: { farmerId: string } | { buyerId: string } | { storageFacilityId: string };
  if (role === "FARMER") {
    scope = { farmerId: session.user.id };
  } else if (role === "STORAGE_FACILITY") {
    const facility = await prisma.storageFacilityProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!facility) return NextResponse.json({ orders: [] });
    scope = { storageFacilityId: facility.id };
  } else {
    scope = { buyerId: session.user.id };
  }

  const where = {
    ...scope,
    ...(status && { status: status as never }),
  };

  const orders = await prisma.order.findMany({
    where,
    include: {
      listing: {
        select: { cropType: true, unit: true, images: true, location: true },
      },
      buyer: { select: { id: true, name: true, phone: true, buyerProfile: true } },
      farmer: { select: { id: true, name: true, phone: true, farmerProfile: true } },
      payment: true,
      transportRequest: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ orders });
}

class OrderError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Sign in to place orders" }, { status: 401 });
  }
  if (!session.user.isVerified) {
    return NextResponse.json(
      { error: "Verify your account before placing orders" },
      { status: 403 }
    );
  }

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const { listingId, quantity, notes, fulfillmentType } = orderSchema.parse(body);

    const { order, deliveryNumber } = await prisma.$transaction(async (tx) => {
      const listing = await tx.produceListing.findUnique({ where: { id: listingId } });

      if (!listing || listing.status !== "ACTIVE") {
        throw new OrderError("Listing not available", 400);
      }

      if (listing.farmerId === session.user.id) {
        throw new OrderError("You cannot order your own listing", 400);
      }

      // Atomic, race-safe stock check: the WHERE clause is re-evaluated against
      // the committed row, so two concurrent orders can't both succeed off a
      // stale quantity read.
      const { count } = await tx.produceListing.updateMany({
        where: { id: listingId, status: "ACTIVE", quantity: { gte: quantity } },
        data: { quantity: { decrement: quantity } },
      });
      if (count === 0) {
        throw new OrderError("Insufficient quantity available", 400);
      }

      const remaining = await tx.produceListing.findUniqueOrThrow({ where: { id: listingId } });
      if (remaining.quantity <= 0) {
        await tx.produceListing.update({ where: { id: listingId }, data: { status: "SOLD" } });
      }

      const totalAmount = quantity * listing.pricePerUnit;

      // Snapshotted at order time so later changes to the listing's storage
      // status don't retroactively change how a past sale is split.
      const storageFacilityId = listing.storageFacilityId;
      const facilityCommissionRate = storageFacilityId ? FACILITY_COMMISSION_RATE : null;
      const facilityCommissionAmount = storageFacilityId ? totalAmount * FACILITY_COMMISSION_RATE : null;

      const created = await tx.order.create({
        data: {
          buyerId: session.user.id,
          farmerId: listing.farmerId,
          listingId,
          quantity,
          totalAmount,
          notes,
          fulfillmentType,
          storageFacilityId,
          facilityCommissionRate,
          facilityCommissionAmount,
        },
        include: {
          listing: { select: { cropType: true, unit: true } },
          buyer: { select: { phone: true } },
          farmer: { select: { name: true, phone: true } },
        },
      });

      // Derive a human-readable delivery number from the order ID
      const number = `LRG-${created.id.slice(-8).toUpperCase()}`;
      await tx.order.update({ where: { id: created.id }, data: { deliveryNumber: number } });

      return { order: created, deliveryNumber: number };
    });

    if (process.env.MNOTIFY_API_KEY) {
      await sendOrderConfirmationSMS({
        buyerPhone: order.buyer.phone,
        farmerPhone: order.farmer.phone,
        cropType: order.listing.cropType,
        quantity,
        unit: order.listing.unit,
        totalAmount: order.totalAmount,
        orderId: order.id,
      }).catch(console.error);
    }

    return NextResponse.json({ order: { ...order, deliveryNumber } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? error.message }, { status: 400 });
    }
    if (error instanceof OrderError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
