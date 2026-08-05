import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyParties } from "@/lib/notify";
import { sendOrderConfirmationSMS } from "@/lib/mnotify";
import { FACILITY_COMMISSION_RATE } from "@/lib/utils";
import { z } from "zod";

// Bulk ordering — pulling from several farmers' listings of the same crop
// into one purchase — is a wholesale/processor buying pattern, not a retail
// one. Gating it here is the concrete version of "buyer segment changes the
// transaction mechanics": a Household/Retailer/Restaurant/Exporter buyer
// still uses the ordinary single-listing order flow.
const BULK_ELIGIBLE_BUSINESS_TYPES = ["WHOLESALER", "PROCESSOR"];

class BulkOrderError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "BUYER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bulkOrders = await prisma.bulkOrder.findMany({
    where: { buyerId: session.user.id },
    include: {
      orders: {
        select: {
          id: true,
          quantity: true,
          totalAmount: true,
          status: true,
          paymentStatus: true,
          listing: { select: { unit: true } },
          farmer: { select: { id: true, name: true, farmerProfile: { select: { farmName: true } } } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ bulkOrders });
}

const bulkOrderSchema = z.object({
  cropType: z.string().min(1),
  fulfillmentType: z.enum(["PICKUP", "DELIVERY"]).default("DELIVERY"),
  notes: z.string().optional(),
  items: z
    .array(z.object({ listingId: z.string(), quantity: z.number().positive() }))
    .min(1, "Select at least one listing"),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Sign in to place a bulk order" }, { status: 401 });
  if (session.user.role !== "BUYER") {
    return NextResponse.json({ error: "Only buyers can place bulk orders" }, { status: 403 });
  }

  const buyerProfile = await prisma.buyerProfile.findUnique({
    where: { userId: session.user.id },
    select: { businessType: true },
  });
  if (!buyerProfile || !BULK_ELIGIBLE_BUSINESS_TYPES.includes(buyerProfile.businessType)) {
    return NextResponse.json(
      { error: "Bulk ordering is available for Wholesaler and Processor accounts — update your business type in your profile." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const data = bulkOrderSchema.parse(body);

    const { bulkOrder, deliveryNumbers } = await prisma.$transaction(async (tx) => {
      const listingIds = data.items.map((i) => i.listingId);
      const listings = await tx.produceListing.findMany({ where: { id: { in: listingIds } } });
      if (listings.length !== listingIds.length) {
        throw new BulkOrderError("One or more listings are no longer available", 400);
      }

      const mismatched = listings.find((l) => l.cropType !== data.cropType);
      if (mismatched) {
        throw new BulkOrderError(
          `All listings in one bulk order must be the same crop — "${mismatched.cropType}" doesn't match "${data.cropType}"`,
          400
        );
      }
      if (listings.some((l) => l.farmerId === session.user.id)) {
        throw new BulkOrderError("You cannot include your own listing in a bulk order", 400);
      }

      let totalQuantity = 0;
      let totalAmount = 0;
      const deliveryNumbers: string[] = [];
      const createdOrderIds: string[] = [];

      const bulk = await tx.bulkOrder.create({
        data: {
          buyerId: session.user.id,
          cropType: data.cropType,
          totalQuantity: 0,
          totalAmount: 0,
          notes: data.notes,
        },
      });

      for (const item of data.items) {
        const listing = listings.find((l) => l.id === item.listingId)!;

        // Same atomic, race-safe stock check as a normal single-listing order.
        const { count } = await tx.produceListing.updateMany({
          where: { id: item.listingId, status: "ACTIVE", quantity: { gte: item.quantity } },
          data: { quantity: { decrement: item.quantity } },
        });
        if (count === 0) {
          throw new BulkOrderError(`Not enough stock left for ${listing.cropType} from one of the selected farmers`, 409);
        }

        const remaining = await tx.produceListing.findUniqueOrThrow({ where: { id: item.listingId } });
        if (remaining.quantity <= 0) {
          await tx.produceListing.update({ where: { id: item.listingId }, data: { status: "SOLD" } });
        }

        const lineAmount = item.quantity * listing.pricePerUnit;
        const storageFacilityId = listing.storageFacilityId;
        const facilityCommissionRate = storageFacilityId ? FACILITY_COMMISSION_RATE : null;
        const facilityCommissionAmount = storageFacilityId ? lineAmount * FACILITY_COMMISSION_RATE : null;

        const order = await tx.order.create({
          data: {
            buyerId: session.user.id,
            farmerId: listing.farmerId,
            listingId: listing.id,
            quantity: item.quantity,
            totalAmount: lineAmount,
            fulfillmentType: data.fulfillmentType,
            notes: data.notes,
            storageFacilityId,
            facilityCommissionRate,
            facilityCommissionAmount,
            bulkOrderId: bulk.id,
          },
        });
        const number = `LRG-${order.id.slice(-8).toUpperCase()}`;
        await tx.order.update({ where: { id: order.id }, data: { deliveryNumber: number } });
        deliveryNumbers.push(number);
        createdOrderIds.push(order.id);

        totalQuantity += item.quantity;
        totalAmount += lineAmount;
      }

      const updatedBulk = await tx.bulkOrder.update({
        where: { id: bulk.id },
        data: { totalQuantity, totalAmount },
        include: {
          orders: {
            include: {
              listing: { select: { cropType: true, unit: true } },
              farmer: { select: { id: true, name: true, phone: true } },
            },
          },
        },
      });

      return { bulkOrder: updatedBulk, deliveryNumbers };
    });

    // Notify each farmer of their own leg individually — they only ever see
    // and manage their own Order, exactly like any other order.
    await notifyParties(
      bulkOrder.orders.map((o) => ({
        phone: o.farmer.phone,
        smsMessage: `Lorgric: New bulk order from a wholesale buyer — ${o.quantity}${o.listing.unit} of your ${o.listing.cropType}, GHS ${o.totalAmount.toFixed(2)}. Open the app to confirm.`,
        inApp: {
          userId: o.farmer.id,
          actorId: session.user.id,
          type: "NEW_ORDER",
          title: `New bulk order — ${o.listing.cropType}`,
          body: `${o.quantity}${o.listing.unit} at GHS ${o.totalAmount.toFixed(2)}`,
          link: "/farmer/orders",
          entityId: o.id,
        },
      }))
    );

    if (process.env.MNOTIFY_API_KEY) {
      await Promise.allSettled(
        bulkOrder.orders.map((o) =>
          sendOrderConfirmationSMS({
            buyerPhone: session.user.phone!,
            farmerPhone: o.farmer.phone,
            cropType: o.listing.cropType,
            quantity: o.quantity,
            unit: o.listing.unit,
            totalAmount: o.totalAmount,
            orderId: o.id,
          })
        )
      );
    }

    return NextResponse.json({ bulkOrder, deliveryNumbers }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? error.message }, { status: 400 });
    }
    if (error instanceof BulkOrderError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Bulk order error:", error);
    return NextResponse.json({ error: "Failed to create bulk order" }, { status: 500 });
  }
}
