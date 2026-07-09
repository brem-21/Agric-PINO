import { prisma } from "@/lib/prisma";

export async function getPlatformStats() {
  const [activeFarmers, produceListings, districtRows, deliveredOrders] = await Promise.all([
    prisma.user.count({ where: { role: "FARMER", isActive: true } }),
    prisma.produceListing.count({ where: { status: "ACTIVE", approvalStatus: "APPROVED" } }),
    prisma.user.findMany({ where: { district: { not: null } }, select: { district: true }, distinct: ["district"] }),
    prisma.order.findMany({
      where: { status: "DELIVERED", listing: { unit: "kg" } },
      select: { quantity: true },
    }),
  ]);

  const kgDelivered = deliveredOrders.reduce((sum, o) => sum + o.quantity, 0);
  const tonsDelivered = Math.round((kgDelivered / 1000) * 10) / 10;

  return {
    activeFarmers,
    produceListings,
    tonsDelivered,
    districtsCovered: districtRows.length,
  };
}
