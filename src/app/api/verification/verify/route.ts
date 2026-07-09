import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyPayment } from "@/lib/paystack";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { reference } = await req.json().catch(() => ({}));
  if (!reference) return NextResponse.json({ error: "Missing reference" }, { status: 400 });

  const request = await prisma.verificationRequest.findUnique({
    where: { paymentReference: reference },
    include: { user: { select: { name: true } } },
  });
  if (!request || request.userId !== session.user.id) {
    return NextResponse.json({ error: "Verification request not found" }, { status: 404 });
  }

  if (request.paymentStatus === "PAID") {
    return NextResponse.json({ status: "success" });
  }

  const result = await verifyPayment(reference);

  if (result.data.status === "success") {
    await prisma.verificationRequest.update({
      where: { id: request.id },
      data: { paymentStatus: "PAID" },
    });

    const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map((a) => ({
          userId: a.id,
          actorId: session.user.id,
          type: "VERIFICATION_SUBMITTED",
          title: `New verification request from ${request.user.name}`,
          body: `${request.role} — GHS ${request.fee} paid, awaiting review`,
          link: "/admin/verifications",
        })),
      });
    }
  }

  return NextResponse.json({ status: result.data.status });
}
