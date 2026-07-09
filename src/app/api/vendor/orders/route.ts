import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const orderSchema = z.object({
  vendorId: z.string(),
  items: z.array(z.object({ productId: z.string(), quantity: z.number().int().positive() })).min(1),
  deliveryAddress: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vendor = await prisma.vendorProfile.findUnique({ where: { userId: session.user.id } });

  if (vendor) {
    const orders = await prisma.vendorOrder.findMany({
      where: { vendorId: vendor.id },
      include: {
        items: { include: { product: true } },
        customer: { select: { name: true, phone: true } },
        delivery: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ orders });
  }

  const orders = await prisma.vendorOrder.findMany({
    where: { customerId: session.user.id },
    include: {
      items: { include: { product: true } },
      vendor: { select: { shopName: true, location: true } },
      delivery: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ orders });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = orderSchema.parse(body);

    const products = await prisma.vendorProduct.findMany({
      where: { id: { in: data.items.map((i) => i.productId) } },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    for (const item of data.items) {
      const product = productMap.get(item.productId);
      if (!product) return NextResponse.json({ error: `Product ${item.productId} not found` }, { status: 404 });
      if (!product.isAvailable) return NextResponse.json({ error: `${product.name} is not available` }, { status: 400 });
      if (product.stock < item.quantity) return NextResponse.json({ error: `Insufficient stock for ${product.name}` }, { status: 400 });
    }

    const totalAmount = data.items.reduce((sum, item) => {
      const product = productMap.get(item.productId)!;
      return sum + product.price * item.quantity;
    }, 0);

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.vendorOrder.create({
        data: {
          vendorId: data.vendorId,
          customerId: session.user.id,
          totalAmount,
          deliveryAddress: data.deliveryAddress,
          notes: data.notes,
          items: {
            create: data.items.map((item) => {
              const product = productMap.get(item.productId)!;
              return {
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: product.price,
                subtotal: product.price * item.quantity,
              };
            }),
          },
        },
        include: { items: { include: { product: true } } },
      });

      for (const item of data.items) {
        await tx.vendorProduct.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      return created;
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Failed to place order" }, { status: 500 });
  }
}
