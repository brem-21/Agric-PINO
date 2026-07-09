import { prisma } from "@/lib/prisma";

/**
 * Cash-on-delivery orders have no separate "payment received" step —
 * physically handing over the produce at delivery IS the payment event.
 * Mobile-money orders are already marked PAID at verification time, well
 * before delivery, so anything still UNPAID by the time it's delivered is
 * a cash handoff that just happened. Settle it.
 */
export async function settleCodPaymentOnDelivery(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payment: true },
  });
  if (!order || order.paymentStatus !== "UNPAID") return;

  await prisma.order.update({ where: { id: orderId }, data: { paymentStatus: "PAID" } });
  if (order.payment) {
    await prisma.payment.update({ where: { orderId }, data: { status: "PAID" } });
  }
}
