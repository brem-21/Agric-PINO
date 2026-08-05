import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyParties } from "@/lib/notify";
import { initializePayment, verifyPayment } from "@/lib/paystack";
import {
  VERIFICATION_TRANSACTION_THRESHOLD,
  isVerificationApplicableRole,
  getCompletedTransactionCount,
  getVerificationFee,
} from "@/lib/verification";
import { z } from "zod";

async function notifyAdminsOfSubmission(
  userId: string,
  userName: string,
  role: string,
  detail: { completedCount: number } | { paidFastTrack: true }
) {
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true, phone: true } });
  if (admins.length === 0) return;

  const summary = "paidFastTrack" in detail
    ? "paid for fast-track verification"
    : `${detail.completedCount} completed transactions`;

  await notifyParties(
    admins.map((a) => ({
      phone: a.phone,
      smsMessage: `Lorgric: ${userName} (${role}) has applied for verification — ${summary}, awaiting review.`,
      inApp: {
        userId: a.id,
        actorId: userId,
        type: "VERIFICATION_SUBMITTED",
        title: `New verification request from ${userName}`,
        body: `${role} — ${summary}, awaiting review`,
        link: "/admin/verifications",
      },
    }))
  );
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      role: true,
      isVerified: true,
      verifiedAt: true,
      ghanaCardNumber: true,
      ghanaCardName: true,
      residenceLocation: true,
      verificationInvitedAt: true,
    },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const latestRequest = await prisma.verificationRequest.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  const completedCount = isVerificationApplicableRole(user.role)
    ? await getCompletedTransactionCount(user.id, user.role)
    : 0;

  return NextResponse.json({
    isVerified: user.isVerified,
    verifiedAt: user.verifiedAt,
    completedCount,
    threshold: VERIFICATION_TRANSACTION_THRESHOLD,
    eligible: completedCount >= VERIFICATION_TRANSACTION_THRESHOLD,
    fee: getVerificationFee(user.role),
    latestRequest,
    ghanaCardNumber: user.ghanaCardNumber,
    ghanaCardName: user.ghanaCardName,
    residenceLocation: user.residenceLocation,
    invited: !!user.verificationInvitedAt,
  });
}

const submitSchema = z.object({
  ghanaCardNumber: z.string().min(1),
  ghanaCardName: z.string().min(1),
  residenceLocation: z.string().min(1),
  idPhotoFront: z.string().min(1),
  idPhotoBack: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);

  // ── Confirm a fast-track payment and hand the request to admins ──────────
  if (searchParams.get("action") === "verify") {
    const { reference } = await req.json();
    if (!reference) return NextResponse.json({ error: "reference is required" }, { status: 400 });

    const request = await prisma.verificationRequest.findUnique({
      where: { paymentReference: reference },
      include: { user: { select: { name: true, role: true } } },
    });
    if (!request || request.userId !== session.user.id) {
      return NextResponse.json({ error: "Verification request not found" }, { status: 404 });
    }
    if (request.paymentStatus === "PAID") {
      return NextResponse.json({ status: "success" });
    }

    const result = await verifyPayment(reference);
    if (result.data.status !== "success") {
      return NextResponse.json({ status: result.data.status });
    }

    await prisma.verificationRequest.update({
      where: { id: request.id },
      data: { paymentStatus: "PAID" },
    });

    // Only now is this request actually reviewable — a human wasn't going to
    // look at an unpaid fast-track application anyway.
    await notifyAdminsOfSubmission(request.userId, request.user.name, request.user.role, { paidFastTrack: true });

    return NextResponse.json({ status: "success" });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, phone: true, role: true, isVerified: true, verificationInvitedAt: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (!isVerificationApplicableRole(user.role)) {
    return NextResponse.json({ error: "Verification is not applicable to this account type" }, { status: 400 });
  }
  if (user.isVerified) return NextResponse.json({ error: "Account is already verified" }, { status: 409 });

  const pendingRequest = await prisma.verificationRequest.findFirst({
    where: { userId: user.id, status: "PENDING" },
  });

  const completedCount = await getCompletedTransactionCount(user.id, user.role);
  const eligibleForFree = completedCount >= VERIFICATION_TRANSACTION_THRESHOLD;

  // An unpaid fast-track application already exists — resume it (re-issue a
  // payment link) instead of blocking the user entirely or creating a
  // duplicate row for the same in-flight application.
  if (pendingRequest && pendingRequest.feeAmount != null && pendingRequest.paymentStatus === "UNPAID") {
    const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const reference = `VERIFY-${user.id}-${Date.now()}`;
    const email = user.email ?? `${user.phone}@lorgric.app`;

    const result = await initializePayment({
      email,
      amount: pendingRequest.feeAmount,
      reference,
      phone: user.phone,
      callbackUrl: `${origin}/payment/callback?type=verification`,
    });

    await prisma.verificationRequest.update({
      where: { id: pendingRequest.id },
      data: { paymentReference: reference },
    });

    return NextResponse.json({ authorizationUrl: result.data.authorization_url, reference });
  }

  if (pendingRequest) {
    return NextResponse.json({ error: "You already have a verification request awaiting review" }, { status: 409 });
  }

  try {
    const body = await req.json();
    const data = submitSchema.parse(body);

    if (eligibleForFree) {
      if (!user.verificationInvitedAt) {
        return NextResponse.json(
          { error: "You need an invite from an admin before applying for free verification." },
          { status: 403 }
        );
      }

      const request = await prisma.verificationRequest.create({
        data: {
          userId: user.id,
          role: user.role,
          ghanaCardNumber: data.ghanaCardNumber,
          ghanaCardName: data.ghanaCardName,
          residenceLocation: data.residenceLocation,
          idPhotoFront: data.idPhotoFront,
          idPhotoBack: data.idPhotoBack,
        },
      });

      await notifyAdminsOfSubmission(user.id, user.name, user.role, { completedCount });
      return NextResponse.json({ request }, { status: 201 });
    }

    // ── Fast track: pay the fee instead of waiting for more transactions ────
    const fee = getVerificationFee(user.role);
    const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const reference = `VERIFY-${user.id}-${Date.now()}`;
    const email = user.email ?? `${user.phone}@lorgric.app`;

    const request = await prisma.verificationRequest.create({
      data: {
        userId: user.id,
        role: user.role,
        ghanaCardNumber: data.ghanaCardNumber,
        ghanaCardName: data.ghanaCardName,
        residenceLocation: data.residenceLocation,
        idPhotoFront: data.idPhotoFront,
        idPhotoBack: data.idPhotoBack,
        feeAmount: fee,
        paymentReference: reference,
      },
    });

    const result = await initializePayment({
      email,
      amount: fee,
      reference,
      phone: user.phone,
      callbackUrl: `${origin}/payment/callback?type=verification`,
    });

    return NextResponse.json({
      request,
      authorizationUrl: result.data.authorization_url,
      reference,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    console.error("Verification submission error:", error);
    return NextResponse.json({ error: "Failed to submit verification request" }, { status: 500 });
  }
}
