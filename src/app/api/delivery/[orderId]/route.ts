import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      listing: {
        select: {
          cropType: true,
          unit: true,
          images: true,
          location: true,
          category: true,
        },
      },
      buyer: {
        select: {
          name: true,
          phone: true,
          isVerified: true,
          verifiedAt: true,
          buyerProfile: { select: { businessName: true } },
        },
      },
      farmer: {
        select: {
          name: true,
          phone: true,
          isVerified: true,
          verifiedAt: true,
          farmerProfile: { select: { farmName: true, location: true } },
        },
      },
      payment: { select: { status: true, method: true } },
      transportRequest: {
        select: {
          pickupLocation: true,
          deliveryLocation: true,
          scheduledDate: true,
          estimatedDeliveryDate: true,
          estimatedCost: true,
          status: true,
          provider: {
            include: {
              user: { select: { name: true, phone: true } },
            },
          },
        },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json(order);
}
