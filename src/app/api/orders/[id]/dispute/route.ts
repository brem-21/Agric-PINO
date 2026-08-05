import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyParties } from "@/lib/notify";
import { z } from "zod";

const disputeSchema = z.object({
  reason: z.enum(["NOT_FRESH", "WRONG_QUANTITY", "WRONG_ITEM", "DAMAGED", "OTHER"]),
  description: z.string().min(1).max(1000),
  photo: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      listing: { select: { cropType: true } },
      farmer: { select: { id: true, name: true, phone: true } },
      buyer: { select: { name: true } },
      dispute: true,
    },
  });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.buyerId !== session.user.id) {
    return NextResponse.json({ error: "Only the buyer can reject produce on their own order" }, { status: 403 });
  }
  if (order.status !== "DELIVERED") {
    return NextResponse.json({ error: "Only a delivered order can be disputed" }, { status: 400 });
  }
  if (order.dispute) {
    return NextResponse.json({ error: "A dispute has already been filed for this order" }, { status: 409 });
  }

  try {
    const data = disputeSchema.parse(await req.json());

    const dispute = await prisma.orderDispute.create({
      data: {
        orderId: id,
        raisedById: session.user.id,
        reason: data.reason,
        description: data.description,
        photo: data.photo,
      },
    });

    const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true, phone: true } });
    await notifyParties([
      {
        phone: order.farmer.phone,
        smsMessage: `Lorgric: ${order.buyer.name} rejected the delivered ${order.listing.cropType} (order #${id.slice(-6).toUpperCase()}) — reason: ${data.reason.replace(/_/g, " ").toLowerCase()}. Open the app to resolve.`,
        inApp: {
          userId: order.farmer.id,
          actorId: session.user.id,
          type: "ORDER_DISPUTED",
          title: `${order.buyer.name} rejected your delivered ${order.listing.cropType}`,
          body: data.description,
          link: "/farmer/orders",
          entityId: id,
        },
      },
      ...admins.map((a) => ({
        phone: a.phone,
        smsMessage: `Lorgric: A dispute was filed on order #${id.slice(-6).toUpperCase()} (${order.listing.cropType}) — awaiting resolution.`,
        inApp: {
          userId: a.id,
          actorId: session.user.id,
          type: "ORDER_DISPUTED",
          title: `New order dispute — ${order.listing.cropType}`,
          body: data.description,
          link: "/admin/disputes",
          entityId: id,
        },
      })),
    ]);

    return NextResponse.json({ dispute }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? error.message }, { status: 400 });
    }
    console.error("Dispute creation error:", error);
    return NextResponse.json({ error: "Failed to file dispute" }, { status: 500 });
  }
}

const resolveSchema = z.object({
  status: z.enum(["RESOLVED_REFUNDED", "RESOLVED_REPLACEMENT", "RESOLVED_DENIED"]),
  resolutionNote: z.string().max(1000).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      listing: { select: { cropType: true } },
      buyer: { select: { id: true, name: true, phone: true } },
      dispute: true,
      payment: true,
    },
  });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (!order.dispute) return NextResponse.json({ error: "No dispute exists for this order" }, { status: 404 });

  const canResolve = order.farmerId === session.user.id || session.user.role === "ADMIN";
  if (!canResolve) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  if (order.dispute.status !== "OPEN") {
    return NextResponse.json({ error: "This dispute is already resolved" }, { status: 409 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = resolveSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid resolution" }, { status: 400 });
  const { status, resolutionNote } = parsed.data;

  const updatedDispute = await prisma.orderDispute.update({
    where: { orderId: id },
    data: {
      status,
      resolutionNote,
      resolvedById: session.user.id,
      resolvedAt: new Date(),
    },
  });

  // A refund resolution is bookkeeping only, same as every other payment
  // state change in this app — there's no live Paystack refund API call
  // wired up; MoMo refunds happen manually, this just records the decision
  // and unblocks anything downstream that reads paymentStatus.
  if (status === "RESOLVED_REFUNDED" && order.paymentStatus === "PAID") {
    await prisma.order.update({ where: { id }, data: { paymentStatus: "REFUNDED" } });
    if (order.payment) {
      await prisma.payment.update({ where: { orderId: id }, data: { status: "REFUNDED" } });
    }
  }

  const resolutionLabel =
    status === "RESOLVED_REFUNDED" ? "refunded" : status === "RESOLVED_REPLACEMENT" ? "a replacement arranged" : "denied";

  await notifyParties([
    {
      phone: order.buyer.phone,
      smsMessage: `Lorgric: Your dispute on order #${id.slice(-6).toUpperCase()} (${order.listing.cropType}) was resolved — ${resolutionLabel}.${resolutionNote ? ` Note: ${resolutionNote}` : ""}`,
      inApp: {
        userId: order.buyer.id,
        actorId: session.user.id,
        type: "ORDER_DISPUTE_RESOLVED",
        title: `Dispute resolved — ${resolutionLabel}`,
        body: resolutionNote ?? `${order.listing.cropType} order dispute resolved.`,
        link: "/buyer/orders",
        entityId: id,
      },
    },
  ]);

  return NextResponse.json({ dispute: updatedDispute });
}
