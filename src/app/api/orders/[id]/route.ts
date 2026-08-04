import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requestOrderReviews } from "@/lib/reviews";
import { settleCodPaymentOnDelivery } from "@/lib/payments";
import { z } from "zod";

const ORDER_STATUSES = ["PENDING", "CONFIRMED", "PROCESSING", "READY_FOR_PICKUP", "IN_TRANSIT", "DELIVERED", "CANCELLED"] as const;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      listing: {
        select: {
          cropType: true,
          unit: true,
          images: true,
          location: true,
          latitude: true,
          longitude: true,
        },
      },
      buyer: {
        select: {
          id: true,
          name: true,
          phone: true,
          image: true,
          region: true,
          district: true,
          residenceLocation: true,
          latitude: true,
          longitude: true,
          buyerProfile: { select: { businessName: true } },
        },
      },
      farmer: {
        select: {
          id: true,
          name: true,
          phone: true,
          image: true,
          farmerProfile: { select: { farmName: true, location: true } },
        },
      },
      payment: true,
      transportRequest: {
        include: {
          provider: {
            include: {
              user: { select: { id: true, name: true, phone: true } },
            },
          },
        },
      },
    },
  });

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  let isParty =
    order.buyerId === session.user.id ||
    order.farmerId === session.user.id ||
    order.transportRequest?.provider?.user?.id === session.user.id;

  if (!isParty && session.user.role === "STORAGE_FACILITY" && order.storageFacilityId) {
    const facility = await prisma.storageFacilityProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    isParty = !!facility && facility.id === order.storageFacilityId;
  }

  if (!isParty && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  return NextResponse.json({ order });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = z.object({ status: z.enum(ORDER_STATUSES) }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  const { status } = parsed.data;

  const order = await prisma.order.findUnique({
    where: { id },
    include: { listing: { select: { cropType: true } }, farmer: { select: { id: true, name: true } } },
  });

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  let isParty = order.buyerId === session.user.id || order.farmerId === session.user.id;

  // A facility acting "on behalf of" the farmer for an order routed through
  // it — every such action is followed by a notification to the farmer below,
  // so the farmer always sees what the facility did on their produce.
  let actingFacilityName: string | null = null;
  if (!isParty && session.user.role === "STORAGE_FACILITY" && order.storageFacilityId) {
    const facility = await prisma.storageFacilityProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true, name: true },
    });
    if (facility && facility.id === order.storageFacilityId) {
      isParty = true;
      actingFacilityName = facility.name;
    }
  }

  if (!isParty && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const updated = await prisma.order.update({
    where: { id },
    data: { status },
  });

  // When order is delivered, settle any outstanding cash payment and
  // trigger review requests for buyer/farmer/rider
  if (status === "DELIVERED") {
    await settleCodPaymentOnDelivery(id);
    await requestOrderReviews(id);
  }

  if (actingFacilityName) {
    await prisma.notification.create({
      data: {
        userId: order.farmer.id,
        actorId: session.user.id,
        type: "ORDER_STATUS_UPDATE",
        title: `${actingFacilityName} updated your order to "${status.replace(/_/g, " ").toLowerCase()}" on your behalf`,
        body: `${order.listing.cropType} order status changed.`,
        link: "/farmer/orders",
        entityId: id,
      },
    });
  }

  return NextResponse.json({ order: updated });
}
