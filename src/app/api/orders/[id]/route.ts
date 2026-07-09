import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requestOrderReviews } from "@/lib/reviews";
import { settleCodPaymentOnDelivery } from "@/lib/payments";

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

  const isParty =
    order.buyerId === session.user.id ||
    order.farmerId === session.user.id ||
    order.transportRequest?.provider?.user?.id === session.user.id;
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

  const { status } = await req.json();

  const order = await prisma.order.findUnique({ where: { id } });

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const isParty = order.buyerId === session.user.id || order.farmerId === session.user.id;
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

  return NextResponse.json({ order: updated });
}
