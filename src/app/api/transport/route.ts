import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { notifyParties } from "@/lib/notify";
import { requestOrderReviews } from "@/lib/reviews";
import { settleCodPaymentOnDelivery } from "@/lib/payments";

const STATUS_LABELS: Record<string, string> = {
  ASSIGNED: "A rider has been assigned to your order",
  PICKED_UP: "Your order has been picked up by the rider",
  IN_TRANSIT: "Your order is on its way",
  DELIVERED: "Your order has been delivered",
  CANCELLED: "Transport for your order has been cancelled",
};

const transportSchema = z.object({
  orderId: z.string().optional(),
  pickupLocation: z.string().min(1),
  pickupLat: z.number().optional(),
  pickupLong: z.number().optional(),
  deliveryLocation: z.string().min(1),
  deliveryLat: z.number().optional(),
  deliveryLong: z.number().optional(),
  scheduledDate: z.string(),
  estimatedCost: z.number().optional(),
  weightKg: z.number().optional(),
  notes: z.string().optional(),
});

const includeDetails = {
  requester: { select: { id: true, name: true, phone: true } },
  provider: { include: { user: { select: { name: true, phone: true } } } },
  order: {
    include: {
      listing: { select: { cropType: true, quantity: true, unit: true } },
      buyer: { select: { name: true, phone: true } },
    },
  },
} as const;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;

  if (role === "LOGISTICS") {
    const logisticsProfile = await prisma.logisticsProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    const profileId = logisticsProfile?.id ?? "";

    const requests = await prisma.transportRequest.findMany({
      where: {
        OR: [
          {
            status: "PENDING",
            NOT: { rejectedByRiders: { has: profileId } },
          },
          { provider: { userId: session.user.id } },
        ],
      },
      include: includeDetails,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ requests });
  }

  const requests = await prisma.transportRequest.findMany({
    where: { requesterId: session.user.id },
    include: includeDetails,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ requests });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = transportSchema.parse(body);

    const request = await prisma.transportRequest.create({
      data: {
        ...data,
        scheduledDate: new Date(data.scheduledDate),
        requesterId: session.user.id,
      },
    });

    // A facility requesting delivery on a farmer's behalf — notify the farmer
    // so every action taken on their produce is visible to them, not silent.
    if (session.user.role === "STORAGE_FACILITY" && data.orderId) {
      const order = await prisma.order.findUnique({
        where: { id: data.orderId },
        select: { farmerId: true, listing: { select: { cropType: true } } },
      });
      const facility = await prisma.storageFacilityProfile.findUnique({
        where: { userId: session.user.id },
        select: { name: true },
      });
      if (order && facility) {
        await prisma.notification.create({
          data: {
            userId: order.farmerId,
            actorId: session.user.id,
            type: "DELIVERY_REQUESTED",
            title: `${facility.name} requested delivery for your order on your behalf`,
            body: `${order.listing.cropType} — a rider has been requested to deliver this order.`,
            link: "/farmer/orders",
            entityId: data.orderId,
          },
        });
      }
    }

    return NextResponse.json({ request }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create transport request" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { requestId, action, estimatedDeliveryDate } = body as {
    requestId: string;
    action: string;
    estimatedDeliveryDate?: string;
  };

  // ── Farmer cancels their own PENDING request ──────────────────────────────
  if (action === "cancel_farmer") {
    const existing = await prisma.transportRequest.findUnique({ where: { id: requestId } });
    if (!existing || existing.requesterId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (existing.status !== "PENDING") {
      return NextResponse.json({ error: "Can only cancel PENDING requests" }, { status: 400 });
    }
    await prisma.transportRequest.update({
      where: { id: requestId },
      data: { status: "CANCELLED" },
    });
    return NextResponse.json({ ok: true });
  }

  // ── All remaining actions require LOGISTICS role ──────────────────────────
  if (session.user.role !== "LOGISTICS") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const logisticsProfile = await prisma.logisticsProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!logisticsProfile) {
    return NextResponse.json({ error: "Logistics profile not found" }, { status: 404 });
  }

  // ── Rider rejects a PENDING request (stays PENDING for others) ────────────
  if (action === "reject") {
    await prisma.transportRequest.update({
      where: { id: requestId },
      data: { rejectedByRiders: { push: logisticsProfile.id } },
    });
    return NextResponse.json({ ok: true });
  }

  // ── Rider gives back an ASSIGNED request ──────────────────────────────────
  if (action === "give_back") {
    await prisma.deliveryLeg.updateMany({
      where: { transportRequestId: requestId, endedAt: null },
      data: { endedAt: new Date(), handoffNote: "Returned to the request pool" },
    });
    await prisma.transportRequest.update({
      where: { id: requestId },
      data: {
        status: "PENDING",
        providerId: null,
        rejectedByRiders: { push: logisticsProfile.id },
      },
    });
    return NextResponse.json({ ok: true });
  }

  // ── Hand off to another rider — mid-delivery relay for 3-4 rider coordination ──
  // Either the current rider or the requesting farmer can trigger this.
  if (action === "handoff") {
    const { nextProviderId, handoffNote } = body as { nextProviderId?: string; handoffNote?: string };

    const existing = await prisma.transportRequest.findUnique({
      where: { id: requestId },
      include: {
        order: {
          include: {
            listing: { select: { cropType: true } },
            buyer: { select: { id: true, phone: true } },
            farmer: { select: { id: true, phone: true } },
          },
        },
        provider: { include: { user: { select: { name: true, phone: true } } } },
      },
    });
    if (!existing) return NextResponse.json({ error: "Request not found" }, { status: 404 });

    const isCurrentRider = existing.providerId === logisticsProfile.id;
    const isRequester = existing.requesterId === session.user.id;
    if (!isCurrentRider && !isRequester) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!["ASSIGNED", "PICKED_UP", "IN_TRANSIT"].includes(existing.status)) {
      return NextResponse.json({ error: "Can only hand off an active delivery" }, { status: 400 });
    }
    if (!nextProviderId || nextProviderId === existing.providerId) {
      return NextResponse.json({ error: "Choose a different rider to hand off to" }, { status: 400 });
    }

    const nextProvider = await prisma.logisticsProfile.findUnique({
      where: { id: nextProviderId },
      select: { id: true, userId: true, user: { select: { name: true, phone: true } } },
    });
    if (!nextProvider) return NextResponse.json({ error: "Rider not found" }, { status: 404 });

    const legCount = await prisma.deliveryLeg.count({ where: { transportRequestId: requestId } });
    await prisma.deliveryLeg.updateMany({
      where: { transportRequestId: requestId, endedAt: null },
      data: { endedAt: new Date(), handoffNote },
    });
    await prisma.deliveryLeg.create({
      data: {
        transportRequestId: requestId,
        providerId: nextProviderId,
        sequence: legCount + 1,
        status: existing.status,
      },
    });
    const updated = await prisma.transportRequest.update({
      where: { id: requestId },
      data: { providerId: nextProviderId },
    });

    if (existing.order) {
      const { order } = existing;
      const outgoing = existing.provider?.user;
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const trackLink = `${appUrl}/tracking/${order.id}`;

      await notifyParties([
        {
          phone: order.buyer.phone,
          smsMessage: `Lorgric: Your ${order.listing.cropType} delivery has changed hands — now with ${nextProvider.user.name}${nextProvider.user.phone ? ` (${nextProvider.user.phone})` : ""} for the next leg. Track: ${trackLink}`,
          inApp: {
            userId: order.buyer.id,
            type: "DELIVERY_UPDATE",
            title: "Your delivery changed hands",
            body: `${order.listing.cropType} is now with ${nextProvider.user.name} for the next leg of the journey.`,
            link: `/tracking/${order.id}`,
          },
        },
        {
          phone: order.farmer.phone,
          smsMessage: `Lorgric: Delivery for your ${order.listing.cropType} order handed off from ${outgoing?.name ?? "the rider"} to ${nextProvider.user.name}.`,
          inApp: {
            userId: order.farmer.id,
            type: "DELIVERY_UPDATE",
            title: "Delivery handed off to next rider",
            body: `${outgoing?.name ?? "The rider"} handed off to ${nextProvider.user.name}.`,
            link: `/tracking/${order.id}`,
          },
        },
        ...(outgoing?.phone
          ? [{
              phone: outgoing.phone,
              smsMessage: `Lorgric: You've handed off the ${order.listing.cropType} delivery to ${nextProvider.user.name}. Thanks for your leg of the journey!`,
            }]
          : []),
        {
          phone: nextProvider.user.phone,
          smsMessage: `Lorgric: You've been assigned the next leg of a delivery — ${order.listing.cropType} to ${updated.deliveryLocation}. Open Lorgric to view details.`,
          inApp: {
            userId: nextProvider.userId,
            type: "DELIVERY_UPDATE",
            title: "You've been handed a delivery leg",
            body: `Continue delivering ${order.listing.cropType} to ${updated.deliveryLocation}.`,
            link: "/logistics/deliveries",
          },
        },
      ]);
    }

    return NextResponse.json({ request: updated });
  }

  // ── Standard status transitions ───────────────────────────────────────────
  const statusMap: Record<string, string> = {
    accept: "ASSIGNED",
    pickup: "PICKED_UP",
    transit: "IN_TRANSIT",
    deliver: "DELIVERED",
    cancel: "CANCELLED",
  };

  const newStatus = statusMap[action];
  if (!newStatus) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const request = await prisma.transportRequest.update({
    where: { id: requestId },
    data: {
      status: newStatus as never,
      ...(action === "accept" && {
        providerId: logisticsProfile.id,
        ...(estimatedDeliveryDate && { estimatedDeliveryDate: new Date(estimatedDeliveryDate) }),
      }),
    },
    include: {
      order: {
        include: {
          listing: { select: { cropType: true, quantity: true, unit: true } },
          buyer: { select: { id: true, phone: true } },
          farmer: { select: { id: true, phone: true } },
        },
      },
      provider: {
        include: { user: { select: { name: true, phone: true } } },
      },
    },
  });

  if (action === "accept") {
    await prisma.deliveryLeg.create({
      data: { transportRequestId: requestId, providerId: logisticsProfile.id, sequence: 1, status: "ASSIGNED" },
    });
  } else {
    await prisma.deliveryLeg.updateMany({
      where: { transportRequestId: requestId, endedAt: null },
      data: {
        status: newStatus as never,
        ...(action === "deliver" || action === "cancel" ? { endedAt: new Date() } : {}),
      },
    });
  }

  // A rider's earnings are the delivery fee actually charged — settle it to
  // the estimate once a delivery completes, since there's no separate
  // "negotiate final cost" step anywhere in the app.
  if (action === "deliver" && request.actualCost == null) {
    await prisma.transportRequest.update({
      where: { id: requestId },
      data: { actualCost: request.estimatedCost ?? 0 },
    });
  }

  if (action === "deliver" && request.orderId) {
    await prisma.order.update({
      where: { id: request.orderId },
      data: { status: "DELIVERED" },
    });
    await settleCodPaymentOnDelivery(request.orderId);
    await requestOrderReviews(request.orderId);
  }

  if (request.order && newStatus !== "PENDING") {
    const { order } = request;
    const riderUser = request.provider?.user ?? { name: session.user.name ?? "Rider", phone: null };
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const trackLink = `${appUrl}/tracking/${request.orderId ?? requestId}`;
    const label = STATUS_LABELS[newStatus] ?? `Order status updated to ${newStatus}`;

    await notifyParties([
      {
        phone: order.buyer.phone,
        smsMessage:
          `Lorgric: ${label}. Order #${(request.orderId ?? requestId).slice(-6).toUpperCase()}: ` +
          `${order.listing.quantity}${order.listing.unit} ${order.listing.cropType}, GHS ${order.totalAmount.toFixed(2)}, ` +
          `delivering to ${request.deliveryLocation}. Rider: ${riderUser.name}${riderUser.phone ? ` (${riderUser.phone})` : ""}. Track: ${trackLink}`,
        inApp: {
          userId: order.buyer.id,
          type: "DELIVERY_UPDATE",
          title: label,
          body: `${order.listing.cropType} — rider: ${riderUser.name}. Delivering to ${request.deliveryLocation}.`,
          link: `/tracking/${request.orderId ?? requestId}`,
        },
      },
      {
        phone: order.farmer.phone,
        smsMessage: `Lorgric: Logistics update — ${label.toLowerCase()} for your ${order.listing.cropType} order (#${(request.orderId ?? requestId).slice(-6).toUpperCase()}). Rider: ${riderUser.name}.`,
        inApp: {
          userId: order.farmer.id,
          type: "DELIVERY_UPDATE",
          title: label,
          body: `${order.listing.cropType} order — rider: ${riderUser.name}.`,
          link: `/tracking/${request.orderId ?? requestId}`,
        },
      },
    ]);
  }

  return NextResponse.json({ request });
}
