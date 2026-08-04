import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyParties } from "@/lib/notify";
import {
  VERIFICATION_TRANSACTION_THRESHOLD,
  isVerificationApplicableRole,
  getCompletedTransactionCount,
} from "@/lib/verification";
import { z } from "zod";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, isVerified: true, verifiedAt: true },
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
    latestRequest,
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

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, role: true, isVerified: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (!isVerificationApplicableRole(user.role)) {
    return NextResponse.json({ error: "Verification is not applicable to this account type" }, { status: 400 });
  }
  if (user.isVerified) return NextResponse.json({ error: "Account is already verified" }, { status: 409 });

  const pendingRequest = await prisma.verificationRequest.findFirst({
    where: { userId: user.id, status: "PENDING" },
  });
  if (pendingRequest) {
    return NextResponse.json({ error: "You already have a verification request awaiting review" }, { status: 409 });
  }

  // The actual security boundary — the eligibility gate is re-checked here
  // server-side regardless of what the UI showed the user.
  const completedCount = await getCompletedTransactionCount(user.id, user.role);
  if (completedCount < VERIFICATION_TRANSACTION_THRESHOLD) {
    return NextResponse.json(
      {
        error: `Not yet eligible — ${VERIFICATION_TRANSACTION_THRESHOLD - completedCount} more completed transaction(s) needed`,
        completedCount,
        threshold: VERIFICATION_TRANSACTION_THRESHOLD,
      },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const data = submitSchema.parse(body);

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

    const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true, phone: true } });
    if (admins.length > 0) {
      await notifyParties(
        admins.map((a) => ({
          phone: a.phone,
          smsMessage: `Lorgric: ${user.name} (${user.role}) has applied for verification — ${completedCount} completed transactions, awaiting review.`,
          inApp: {
            userId: a.id,
            actorId: user.id,
            type: "VERIFICATION_SUBMITTED",
            title: `New verification request from ${user.name}`,
            body: `${user.role} — ${completedCount} completed transactions, awaiting review`,
            link: "/admin/verifications",
          },
        }))
      );
    }

    return NextResponse.json({ request }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    console.error("Verification submission error:", error);
    return NextResponse.json({ error: "Failed to submit verification request" }, { status: 500 });
  }
}
