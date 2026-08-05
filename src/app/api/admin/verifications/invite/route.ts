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

const inviteSchema = z.object({ userId: z.string().min(1) });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "userId is required" }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true, name: true, phone: true, role: true, isVerified: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (!isVerificationApplicableRole(user.role)) {
    return NextResponse.json({ error: "Verification is not applicable to this account type" }, { status: 400 });
  }
  if (user.isVerified) return NextResponse.json({ error: "This account is already verified" }, { status: 400 });

  const completedCount = await getCompletedTransactionCount(user.id, user.role);
  if (completedCount < VERIFICATION_TRANSACTION_THRESHOLD) {
    return NextResponse.json({ error: "This user hasn't crossed the free-verification threshold yet" }, { status: 400 });
  }

  const blockingRequest = await prisma.verificationRequest.findFirst({
    where: { userId: user.id, status: { not: "REJECTED" } },
  });
  if (blockingRequest) {
    return NextResponse.json({ error: "This user already has an application on file" }, { status: 400 });
  }

  const invitedAt = new Date();
  await prisma.user.update({ where: { id: user.id }, data: { verificationInvitedAt: invitedAt } });

  await notifyParties([
    {
      phone: user.phone,
      smsMessage: "Lorgric: You're eligible for free verification — open the app and submit your Ghana Card number/photo to apply.",
      inApp: {
        userId: user.id,
        actorId: session.user.id,
        type: "VERIFICATION_INVITE",
        title: "You can now apply for verification",
        body: "An admin has invited you to apply — submit your Ghana Card photo to get your verified badge.",
        link: "/verification",
      },
    },
  ]);

  return NextResponse.json({ invitedAt });
}
