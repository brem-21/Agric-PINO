import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { VendorOrderStatus } from "@prisma/client";
import { requestVendorOrderReviews } from "@/lib/reviews";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { status } = (await req.json()) as { status: VendorOrderStatus };

  const order = await prisma.vendorOrder.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const vendor = await prisma.vendorProfile.findUnique({ where: { userId: session.user.id } });

  if (vendor && vendor.id === order.vendorId) {
    const updated = await prisma.vendorOrder.update({ where: { id }, data: { status } });
    if (status === "DELIVERED") {
      await requestVendorOrderReviews(id);
    }
    return NextResponse.json({ order: updated });
  }

  if (order.customerId === session.user.id) {
    if (status !== "CANCELLED") return NextResponse.json({ error: "Customers can only cancel orders" }, { status: 403 });
    if (order.status !== "PENDING") return NextResponse.json({ error: "Can only cancel PENDING orders" }, { status: 400 });
    const updated = await prisma.vendorOrder.update({ where: { id }, data: { status: "CANCELLED" } });
    return NextResponse.json({ order: updated });
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
}
