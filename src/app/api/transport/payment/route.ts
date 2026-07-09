import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { initializePayment, verifyPayment, generatePaymentReference } from "@/lib/paystack";
import { notifyParties } from "@/lib/notify";
import { z } from "zod";

const initSchema = z.object({
  requestId: z.string(),
  momoPhone: z.string().min(10),
  provider: z.enum(["mtn", "tigo"]).default("mtn"),
});

async function notifyProviderOfPaymentMethod(requestId: string, method: "CASH" | "MOBILE_MONEY") {
  const request = await prisma.transportRequest.findUnique({
    where: { id: requestId },
    include: { provider: { include: { user: { select: { id: true, phone: true } } } } },
  });
  if (!request?.provider) return;

  const label = method === "CASH" ? "Cash on delivery" : "Paid online via Paystack";
  await notifyParties([
    {
      phone: request.provider.user.phone,
      smsMessage: `Lorgric: The farmer has chosen "${label}" for this delivery job.`,
      inApp: {
        userId: request.provider.user.id,
        type: "DELIVERY_UPDATE",
        title: "Delivery payment method set",
        body: label,
        link: "/logistics/deliveries",
      },
    },
  ]);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  if (action === "verify") {
    const { reference } = await req.json();
    const result = await verifyPayment(reference);

    if (result.data.status === "success") {
      const updated = await prisma.transportRequest.updateMany({
        where: { paymentReference: reference },
        data: { paymentStatus: "PAID" },
      });
      if (updated.count > 0) {
        const request = await prisma.transportRequest.findFirst({ where: { paymentReference: reference } });
        if (request) await notifyProviderOfPaymentMethod(request.id, "MOBILE_MONEY");
      }
    }

    return NextResponse.json({ status: result.data.status });
  }

  if (action === "cod") {
    const { requestId } = await req.json();
    const request = await prisma.transportRequest.findUnique({ where: { id: requestId } });
    if (!request || request.requesterId !== session.user.id) {
      return NextResponse.json({ error: "Transport request not found" }, { status: 404 });
    }
    await prisma.transportRequest.update({
      where: { id: requestId },
      data: { paymentMethod: "CASH", paymentStatus: "UNPAID", paymentReference: null },
    });
    await notifyProviderOfPaymentMethod(requestId, "CASH");
    return NextResponse.json({ ok: true });
  }

  try {
    const body = await req.json();
    const { requestId, momoPhone, provider } = initSchema.parse(body);

    const request = await prisma.transportRequest.findUnique({
      where: { id: requestId },
      include: { requester: { select: { email: true, phone: true } } },
    });

    if (!request || request.requesterId !== session.user.id) {
      return NextResponse.json({ error: "Transport request not found" }, { status: 404 });
    }
    if (!request.estimatedCost) {
      return NextResponse.json({ error: "This request has no agreed cost yet" }, { status: 400 });
    }
    if (request.paymentStatus === "PAID") {
      return NextResponse.json({ error: "Already paid" }, { status: 400 });
    }

    const reference = generatePaymentReference(requestId);
    const email = request.requester.email ?? `${request.requester.phone}@lorgric.app`;
    const origin = new URL(req.url).origin;

    const result = await initializePayment({
      email,
      amount: request.estimatedCost,
      reference,
      phone: momoPhone,
      provider,
      callbackUrl: `${origin}/payment/callback?type=transport&requestId=${requestId}`,
    });

    await prisma.transportRequest.update({
      where: { id: requestId },
      data: { paymentMethod: "MOBILE_MONEY", paymentReference: reference, paymentStatus: "UNPAID" },
    });

    return NextResponse.json({
      authorizationUrl: result.data.authorization_url,
      reference,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? error.message }, { status: 400 });
    }
    console.error("Transport payment error:", error);
    return NextResponse.json({ error: "Payment initialization failed" }, { status: 500 });
  }
}
