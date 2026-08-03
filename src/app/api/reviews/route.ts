import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import type { UserRole } from "@prisma/client";

const reviewSchema = z.object({
  orderId: z.string(),
  targetId: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
  orderType: z.enum(["ORDER"]).default("ORDER"),
});

const PROFILE_BY_ROLE: Record<UserRole, "farmerProfile" | "buyerProfile" | "logisticsProfile" | "storageFacilityProfile" | null> = {
  FARMER: "farmerProfile",
  BUYER: "buyerProfile",
  LOGISTICS: "logisticsProfile",
  STORAGE_FACILITY: "storageFacilityProfile",
  ADMIN: null,
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { orderId, targetId, rating, comment, orderType } = reviewSchema.parse(body);

    // A review may only be submitted against a request we ourselves queued —
    // this is also what authorizes the caller (buyer/farmer/rider/customer),
    // so there's no need to re-derive party membership from the order here.
    const reviewRequest = await prisma.reviewRequest.findUnique({
      where: { orderId_userId_targetId: { orderId, userId: session.user.id, targetId } },
    });
    if (!reviewRequest || reviewRequest.orderType !== orderType) {
      return NextResponse.json({ error: "No pending review for this order" }, { status: 403 });
    }
    if (reviewRequest.completed) {
      return NextResponse.json({ error: "Already reviewed" }, { status: 400 });
    }

    const review = await prisma.review.create({
      data: { authorId: session.user.id, targetId, orderId, orderType, rating, comment },
    });

    // Recompute the target's aggregate rating from every review they've received
    const allReviews = await prisma.review.findMany({
      where: { targetId },
      select: { rating: true },
    });
    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

    const profileField = PROFILE_BY_ROLE[reviewRequest.targetRole];
    if (profileField === "farmerProfile") {
      await prisma.farmerProfile.updateMany({ where: { userId: targetId }, data: { rating: avgRating, totalRatings: allReviews.length } });
    } else if (profileField === "buyerProfile") {
      await prisma.buyerProfile.updateMany({ where: { userId: targetId }, data: { rating: avgRating, totalRatings: allReviews.length } });
    } else if (profileField === "logisticsProfile") {
      await prisma.logisticsProfile.updateMany({ where: { userId: targetId }, data: { rating: avgRating, totalRatings: allReviews.length } });
    } else if (profileField === "storageFacilityProfile") {
      await prisma.storageFacilityProfile.updateMany({ where: { userId: targetId }, data: { rating: avgRating, totalRatings: allReviews.length } });
    }

    await prisma.reviewRequest.update({
      where: { id: reviewRequest.id },
      data: { completed: true },
    });

    return NextResponse.json({ review }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to submit review" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const targetId = searchParams.get("targetId");
  const orderId = searchParams.get("orderId");

  const where = {
    ...(targetId && { targetId }),
    ...(orderId && { orderId }),
  };

  const reviews = await prisma.review.findMany({
    where,
    include: {
      author: { select: { name: true, image: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ reviews });
}
