import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vendor = await prisma.vendorProfile.findUnique({ where: { userId: session.user.id } });
  if (!vendor) return NextResponse.json({ error: "Vendor profile not found" }, { status: 404 });

  const [orders, orderItems] = await Promise.all([
    prisma.vendorOrder.findMany({ where: { vendorId: vendor.id }, select: { status: true, totalAmount: true } }),
    prisma.vendorOrderItem.findMany({
      where: { order: { vendorId: vendor.id, status: "DELIVERED" } },
      include: { product: { select: { name: true, category: true } } },
    }),
  ]);

  const totalRevenue = orders.filter((o) => o.status === "DELIVERED").reduce((s, o) => s + o.totalAmount, 0);
  const totalOrders = orders.length;
  const pendingOrders = orders.filter((o) => o.status === "PENDING").length;
  const confirmedOrders = orders.filter((o) => ["CONFIRMED", "PROCESSING"].includes(o.status)).length;
  const deliveredOrders = orders.filter((o) => o.status === "DELIVERED").length;
  const cancelledOrders = orders.filter((o) => o.status === "CANCELLED").length;
  const shippedOrders = orders.filter((o) => o.status === "SHIPPED").length;

  const productSales = new Map<string, { name: string; category: string; qty: number; revenue: number }>();
  for (const item of orderItems) {
    const existing = productSales.get(item.productId) ?? {
      name: item.product.name,
      category: item.product.category,
      qty: 0,
      revenue: 0,
    };
    existing.qty += item.quantity;
    existing.revenue += item.subtotal;
    productSales.set(item.productId, existing);
  }
  const topProducts = [...productSales.entries()]
    .sort((a, b) => b[1].qty - a[1].qty)
    .slice(0, 5)
    .map(([productId, data]) => ({ productId, ...data }));

  return NextResponse.json({
    analytics: {
      totalRevenue,
      totalOrders,
      pendingOrders,
      confirmedOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      topProducts,
    },
  });
}
