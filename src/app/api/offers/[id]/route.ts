import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyParties } from "@/lib/notify";
import { sendOrderConfirmationSMS } from "@/lib/mnotify";
import { FACILITY_COMMISSION_RATE } from "@/lib/utils";
import { z } from "zod";

const OFFER_EXPIRY_HOURS = 48;

const patchSchema = z.object({
  action: z.enum(["counter", "accept", "reject", "cancel"]),
  quantity: z.number().positive().optional(),
  pricePerUnit: z.number().positive().optional(),
  message: z.string().max(500).optional(),
});

class OfferError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { action, quantity, pricePerUnit, message } = patchSchema.parse(body);

    const offer = await prisma.offer.findUnique({
      where: { id },
      include: {
        listing: true,
        buyer: { select: { id: true, name: true, phone: true } },
        farmer: { select: { id: true, name: true, phone: true } },
      },
    });
    if (!offer) return NextResponse.json({ error: "Offer not found" }, { status: 404 });

    const isBuyer = offer.buyerId === session.user.id;
    const isFarmer = offer.farmerId === session.user.id;
    if (!isBuyer && !isFarmer && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (offer.status !== "PENDING" && offer.status !== "COUNTERED") {
      return NextResponse.json({ error: `This offer is already ${offer.status.toLowerCase()}` }, { status: 409 });
    }
    if (offer.expiresAt < new Date()) {
      await prisma.offer.update({ where: { id }, data: { status: "EXPIRED" } });
      return NextResponse.json({ error: "This offer has expired" }, { status: 409 });
    }

    const myParty = isBuyer ? "BUYER" : "FARMER";
    const otherParty = isBuyer ? offer.farmer : offer.buyer;
    // Whoever proposed the terms on the table is waiting on the OTHER party —
    // they can't also be the one to accept or counter their own proposal.
    const isMyTurn = offer.lastActionBy !== myParty;

    if (action === "cancel") {
      if (!isBuyer) return NextResponse.json({ error: "Only the buyer can cancel an offer" }, { status: 403 });
      const updated = await prisma.offer.update({ where: { id }, data: { status: "CANCELLED" } });
      return NextResponse.json({ offer: updated });
    }

    if (action === "reject") {
      if (!isMyTurn) return NextResponse.json({ error: "Waiting on the other party — nothing to reject yet" }, { status: 409 });
      const updated = await prisma.offer.update({ where: { id }, data: { status: "REJECTED" } });
      await notifyParties([
        {
          phone: otherParty.phone,
          smsMessage: `Lorgric: Your offer on ${offer.listing.cropType} was declined.`,
          inApp: {
            userId: otherParty.id,
            actorId: session.user.id,
            type: "OFFER_REJECTED",
            title: `Offer declined — ${offer.listing.cropType}`,
            body: `${offer.quantity} ${offer.listing.unit} at GHS ${offer.pricePerUnit}/${offer.listing.unit}`,
            link: isBuyer ? "/farmer/offers" : "/buyer/offers",
          },
        },
      ]);
      return NextResponse.json({ offer: updated });
    }

    if (action === "counter") {
      if (!isMyTurn) return NextResponse.json({ error: "Waiting on the other party — nothing to counter yet" }, { status: 409 });
      if (!quantity || !pricePerUnit) {
        return NextResponse.json({ error: "Counter requires a quantity and price" }, { status: 400 });
      }
      if (quantity > offer.listing.quantity) {
        return NextResponse.json({ error: `Only ${offer.listing.quantity} ${offer.listing.unit} available` }, { status: 400 });
      }
      const updated = await prisma.offer.update({
        where: { id },
        data: {
          quantity,
          pricePerUnit,
          message: message ?? offer.message,
          status: "COUNTERED",
          lastActionBy: myParty,
          expiresAt: new Date(Date.now() + OFFER_EXPIRY_HOURS * 60 * 60 * 1000),
        },
      });
      await notifyParties([
        {
          phone: otherParty.phone,
          smsMessage: `Lorgric: ${session.user.name} countered with GHS ${pricePerUnit}/unit for ${quantity} ${offer.listing.unit} of ${offer.listing.cropType}. Open the app to respond.`,
          inApp: {
            userId: otherParty.id,
            actorId: session.user.id,
            type: "OFFER_COUNTERED",
            title: `Countered offer — ${offer.listing.cropType}`,
            body: `${quantity} ${offer.listing.unit} at GHS ${pricePerUnit}/${offer.listing.unit}`,
            link: isBuyer ? "/farmer/offers" : "/buyer/offers",
          },
        },
      ]);
      return NextResponse.json({ offer: updated });
    }

    // action === "accept"
    if (!isMyTurn) return NextResponse.json({ error: "Waiting on the other party — nothing to accept yet" }, { status: 409 });

    const { order, deliveryNumber } = await prisma.$transaction(async (tx) => {
      const listing = await tx.produceListing.findUnique({ where: { id: offer.listingId } });
      if (!listing || listing.status !== "ACTIVE") {
        throw new OfferError("This listing is no longer available", 400);
      }

      // Mirrors POST /api/orders' atomic, race-safe stock check — the
      // negotiated quantity may no longer fit if stock moved since the offer
      // was made.
      const { count } = await tx.produceListing.updateMany({
        where: { id: offer.listingId, status: "ACTIVE", quantity: { gte: offer.quantity } },
        data: { quantity: { decrement: offer.quantity } },
      });
      if (count === 0) {
        throw new OfferError("Not enough stock left to fulfil this offer's quantity", 409);
      }

      const remaining = await tx.produceListing.findUniqueOrThrow({ where: { id: offer.listingId } });
      if (remaining.quantity <= 0) {
        await tx.produceListing.update({ where: { id: offer.listingId }, data: { status: "SOLD" } });
      }

      const totalAmount = offer.quantity * offer.pricePerUnit;
      const storageFacilityId = listing.storageFacilityId;
      const facilityCommissionRate = storageFacilityId ? FACILITY_COMMISSION_RATE : null;
      const facilityCommissionAmount = storageFacilityId ? totalAmount * FACILITY_COMMISSION_RATE : null;

      const created = await tx.order.create({
        data: {
          buyerId: offer.buyerId,
          farmerId: offer.farmerId,
          listingId: offer.listingId,
          quantity: offer.quantity,
          totalAmount,
          notes: `Order created from a negotiated offer — GHS ${offer.pricePerUnit}/${listing.unit}, agreed via in-app negotiation.`,
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

      const number = `LRG-${created.id.slice(-8).toUpperCase()}`;
      await tx.order.update({ where: { id: created.id }, data: { deliveryNumber: number } });
      await tx.offer.update({ where: { id: offer.id }, data: { status: "ACCEPTED", orderId: created.id } });

      return { order: created, deliveryNumber: number };
    }).catch((error) => {
      if (error instanceof OfferError) throw error;
      throw new OfferError("Failed to accept offer", 500);
    });

    if (process.env.MNOTIFY_API_KEY) {
      await sendOrderConfirmationSMS({
        buyerPhone: order.buyer.phone,
        farmerPhone: order.farmer.phone,
        cropType: order.listing.cropType,
        quantity: offer.quantity,
        unit: order.listing.unit,
        totalAmount: order.totalAmount,
        orderId: order.id,
      }).catch(console.error);
    }

    await notifyParties([
      {
        phone: otherParty.phone,
        smsMessage: `Lorgric: Your offer on ${offer.listing.cropType} was accepted! Order #${order.id.slice(-6).toUpperCase()} created at GHS ${offer.pricePerUnit}/${order.listing.unit}.`,
        inApp: {
          userId: otherParty.id,
          actorId: session.user.id,
          type: "OFFER_ACCEPTED",
          title: `Offer accepted — ${offer.listing.cropType}`,
          body: `Order created at GHS ${offer.pricePerUnit}/${order.listing.unit}, ${offer.quantity} ${order.listing.unit}.`,
          link: isBuyer ? "/farmer/orders" : "/buyer/orders",
          entityId: order.id,
        },
      },
    ]);

    return NextResponse.json({ order: { ...order, deliveryNumber } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? error.message }, { status: 400 });
    }
    if (error instanceof OfferError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to update offer" }, { status: 500 });
  }
}
