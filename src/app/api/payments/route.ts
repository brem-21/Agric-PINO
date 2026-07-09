import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { initializePayment, verifyPayment, generatePaymentReference } from "@/lib/paystack";
import { z } from "zod";

const initSchema = z.object({
  orderId: z.string(),
  momoPhone: z.string().min(10),
  provider: z.enum(["mtn", "tigo"]).default("mtn"),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  if (action === "verify") {
    const { reference } = await req.json();
    const result = await verifyPayment(reference);

    if (result.data.status === "success") {
      await prisma.payment.updateMany({
        where: { reference },
        data: { status: "PAID" },
      });
      await prisma.order.updateMany({
        where: { payment: { reference } },
        data: { paymentStatus: "PAID", status: "CONFIRMED" },
      });
    }

    return NextResponse.json({ status: result.data.status });
  }

  if (action === "cod") {
    const { orderId } = await req.json();
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.buyerId !== session.user.id) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    await prisma.payment.upsert({
      where: { orderId },
      update: { method: "CASH", status: "UNPAID", reference: null, momoPhone: null },
      create: { orderId, amount: order.totalAmount, method: "CASH", status: "UNPAID" },
    });
    return NextResponse.json({ ok: true });
  }

  try {
    const body = await req.json();
    const { orderId, momoPhone, provider } = initSchema.parse(body);

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { buyer: { select: { email: true, phone: true } } },
    });

    if (!order || order.buyerId !== session.user.id) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.paymentStatus === "PAID") {
      return NextResponse.json({ error: "Order already paid" }, { status: 400 });
    }

    const reference = generatePaymentReference(orderId);
    const email = order.buyer.email ?? `${order.buyer.phone}@lorgric.app`;
    const origin = new URL(req.url).origin;

    const result = await initializePayment({
      email,
      amount: order.totalAmount,
      reference,
      phone: momoPhone,
      provider,
      callbackUrl: `${origin}/payment/callback?orderId=${orderId}`,
    });

    await prisma.payment.upsert({
      where: { orderId },
      update: { reference, momoPhone, status: "UNPAID" },
      create: {
        orderId,
        amount: order.totalAmount,
        method: "MOBILE_MONEY",
        reference,
        momoPhone,
      },
    });

    return NextResponse.json({
      authorizationUrl: result.data.authorization_url,
      reference,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? error.message }, { status: 400 });
    }
    console.error("Payment error:", error);
    return NextResponse.json({ error: "Payment initialization failed" }, { status: 500 });
  }
}
