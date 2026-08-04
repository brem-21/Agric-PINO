import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyParties } from "@/lib/notify";
import { z } from "zod";

const OFFER_EXPIRY_HOURS = 48;

const createOfferSchema = z.object({
  listingId: z.string(),
  quantity: z.number().positive(),
  pricePerUnit: z.number().positive(),
  message: z.string().max(500).optional(),
});

// Offers past their expiry are still "PENDING/COUNTERED" in the DB until
// something touches them — flip anything relevant to this caller to EXPIRED
// before reading, so nobody accepts/counters a deal that's already lapsed.
async function expireStale(userId: string) {
  await prisma.offer.updateMany({
    where: {
      status: { in: ["PENDING", "COUNTERED"] },
      expiresAt: { lt: new Date() },
      OR: [{ buyerId: userId }, { farmerId: userId }],
    },
    data: { status: "EXPIRED" },
  });
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await expireStale(session.user.id);

  const { searchParams } = new URL(req.url);
  const listingId = searchParams.get("listingId");

  const scope =
    session.user.role === "FARMER"
      ? { farmerId: session.user.id }
      : { buyerId: session.user.id };

  const offers = await prisma.offer.findMany({
    where: { ...scope, ...(listingId && { listingId }) },
    include: {
      listing: { select: { id: true, cropType: true, unit: true, images: true, pricePerUnit: true, quantity: true, status: true } },
      buyer: { select: { id: true, name: true, phone: true } },
      farmer: { select: { id: true, name: true, phone: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ offers });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Sign in to make an offer" }, { status: 401 });
  if (session.user.role !== "BUYER") {
    return NextResponse.json({ error: "Only buyers can make offers" }, { status: 403 });
  }
  if (!session.user.isVerified) {
    return NextResponse.json({ error: "Verify your account before making offers" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const data = createOfferSchema.parse(body);

    const listing = await prisma.produceListing.findUnique({ where: { id: data.listingId } });
    if (!listing || listing.status !== "ACTIVE" || listing.approvalStatus !== "APPROVED") {
      return NextResponse.json({ error: "Listing not available" }, { status: 400 });
    }
    if (listing.farmerId === session.user.id) {
      return NextResponse.json({ error: "You cannot make an offer on your own listing" }, { status: 400 });
    }
    if (data.quantity > listing.quantity) {
      return NextResponse.json({ error: `Only ${listing.quantity} ${listing.unit} available` }, { status: 400 });
    }

    const existing = await prisma.offer.findFirst({
      where: { listingId: data.listingId, buyerId: session.user.id, status: { in: ["PENDING", "COUNTERED"] } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "You already have an open offer on this listing — counter or cancel it first." },
        { status: 409 }
      );
    }

    const offer = await prisma.offer.create({
      data: {
        listingId: data.listingId,
        buyerId: session.user.id,
        farmerId: listing.farmerId,
        quantity: data.quantity,
        pricePerUnit: data.pricePerUnit,
        message: data.message,
        lastActionBy: "BUYER",
        expiresAt: new Date(Date.now() + OFFER_EXPIRY_HOURS * 60 * 60 * 1000),
      },
      include: { buyer: { select: { name: true, phone: true } }, farmer: { select: { phone: true } } },
    });

    await notifyParties([
      {
        phone: offer.farmer.phone,
        smsMessage: `Lorgric: ${offer.buyer.name} offered GHS ${data.pricePerUnit}/unit for ${data.quantity} ${listing.unit} of your ${listing.cropType}. Open the app to respond.`,
        inApp: {
          userId: listing.farmerId,
          actorId: session.user.id,
          type: "OFFER_RECEIVED",
          title: `${offer.buyer.name} made an offer on your ${listing.cropType}`,
          body: `${data.quantity} ${listing.unit} at GHS ${data.pricePerUnit}/${listing.unit}`,
          link: "/farmer/offers",
          entityId: offer.id,
        },
      },
    ]);

    return NextResponse.json({ offer }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create offer" }, { status: 500 });
  }
}
