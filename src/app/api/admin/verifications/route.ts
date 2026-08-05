import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  VERIFICATION_TRANSACTION_THRESHOLD,
  VERIFICATION_APPLICABLE_ROLES,
  getCompletedTransactionCount,
} from "@/lib/verification";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const view = searchParams.get("view"); // "eligible" for the proactive-outreach queue
  const status = searchParams.get("status");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20"));

  if (view === "eligible") {
    // Unverified users who've already crossed the activity threshold but have
    // no non-rejected request yet — computed live, no stored/flagged column.
    const unverifiedUsers = await prisma.user.findMany({
      where: { role: { in: [...VERIFICATION_APPLICABLE_ROLES] }, isVerified: false },
      select: { id: true, name: true, phone: true, role: true, createdAt: true, verificationInvitedAt: true },
    });

    const existingRequests = await prisma.verificationRequest.findMany({
      where: { userId: { in: unverifiedUsers.map((u) => u.id) }, status: { not: "REJECTED" } },
      select: { userId: true },
    });
    const alreadyApplied = new Set(existingRequests.map((r) => r.userId));

    const counted = await Promise.all(
      unverifiedUsers
        .filter((u) => !alreadyApplied.has(u.id))
        .map(async (u) => ({
          ...u,
          completedCount: await getCompletedTransactionCount(u.id, u.role),
        }))
    );

    const eligible = counted
      .filter((u) => u.completedCount >= VERIFICATION_TRANSACTION_THRESHOLD)
      .sort((a, b) => b.completedCount - a.completedCount);

    return NextResponse.json({ data: eligible, threshold: VERIFICATION_TRANSACTION_THRESHOLD });
  }

  const where = {
    ...(status && { status: status as never }),
    // An unpaid fast-track application isn't actually reviewable yet — don't
    // surface it to admins until its payment clears (see /api/verification's
    // ?action=verify).
    OR: [{ feeAmount: null }, { paymentStatus: "PAID" as never }],
  };

  const [requests, total] = await Promise.all([
    prisma.verificationRequest.findMany({
      where,
      select: {
        id: true,
        role: true,
        ghanaCardNumber: true,
        ghanaCardName: true,
        residenceLocation: true,
        idPhotoFront: true,
        idPhotoBack: true,
        status: true,
        reviewNotes: true,
        reviewedAt: true,
        createdAt: true,
        user: { select: { id: true, name: true, phone: true, image: true } },
        reviewedBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.verificationRequest.count({ where }),
  ]);

  return NextResponse.json({
    data: requests,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}
