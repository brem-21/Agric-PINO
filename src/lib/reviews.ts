import { prisma } from "@/lib/prisma";
import { notifyParties } from "@/lib/notify";
import type { UserRole } from "@prisma/client";

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

async function queueReviewRequests(
  orderId: string,
  pairs: { userId: string; targetId: string; targetRole: UserRole }[]
) {
  const fresh = pairs.filter((p) => p.userId !== p.targetId);
  if (fresh.length === 0) return;

  await prisma.reviewRequest.createMany({
    data: fresh.map((p) => ({ orderType: "ORDER", orderId, ...p })),
    skipDuplicates: true,
  });
}

/**
 * Called once a produce order reaches DELIVERED. Queues review requests for
 * the buyer (rates the farmer, and the rider if one was assigned) and the
 * farmer (rates the buyer), and nudges each with an in-app + SMS notification.
 */
export async function requestOrderReviews(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      buyer: { select: { id: true, name: true, phone: true } },
      farmer: { select: { id: true, name: true, phone: true } },
      listing: { select: { cropType: true } },
      transportRequest: {
        include: { provider: { include: { user: { select: { id: true, phone: true } } } } },
      },
    },
  });
  if (!order) return;

  const pairs: { userId: string; targetId: string; targetRole: UserRole }[] = [
    { userId: order.buyerId, targetId: order.farmerId, targetRole: "FARMER" },
    { userId: order.farmerId, targetId: order.buyerId, targetRole: "BUYER" },
  ];

  const rider = order.transportRequest?.provider?.user;
  const ridesWithRider = Boolean(rider);
  if (rider) {
    pairs.push({ userId: order.buyerId, targetId: rider.id, targetRole: "LOGISTICS" });
  }

  await queueReviewRequests(orderId, pairs);

  const link = `/review/${orderId}`;
  await notifyParties([
    {
      phone: order.buyer.phone,
      smsMessage: `Lorgric: Your ${order.listing.cropType} order is complete. Rate your experience: ${appUrl()}${link}`,
      inApp: {
        userId: order.buyer.id,
        type: "REVIEW_REQUEST",
        title: "Rate your order",
        body: ridesWithRider
          ? `Let us know how ${order.farmer.name} and your delivery rider did.`
          : `Let us know how ${order.farmer.name} did.`,
        link,
      },
    },
    {
      phone: order.farmer.phone,
      smsMessage: `Lorgric: Your ${order.listing.cropType} order is complete. Rate your buyer: ${appUrl()}${link}`,
      inApp: {
        userId: order.farmer.id,
        type: "REVIEW_REQUEST",
        title: "Rate your buyer",
        body: `Let us know how ${order.buyer.name} did.`,
        link,
      },
    },
  ]);
}
