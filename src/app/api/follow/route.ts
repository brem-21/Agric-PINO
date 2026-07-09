import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_IDS = 50;

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("ids") ?? "";
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, MAX_IDS);

  if (ids.length === 0) {
    return NextResponse.json({});
  }

  const session = await auth();

  // Fetch follower counts for all requested IDs in one query
  const counts = await prisma.follow.groupBy({
    by: ["followingId"],
    where: { followingId: { in: ids } },
    _count: { followingId: true },
  });

  const countMap: Record<string, number> = {};
  for (const row of counts) {
    countMap[row.followingId] = row._count.followingId;
  }

  // Fetch which ones the current user follows (empty set when unauthenticated)
  const followingSet = new Set<string>();
  if (session) {
    const follows = await prisma.follow.findMany({
      where: {
        followerId: session.user.id,
        followingId: { in: ids },
      },
      select: { followingId: true },
    });
    for (const f of follows) followingSet.add(f.followingId);
  }

  const result: Record<string, { isFollowing: boolean; followerCount: number }> = {};
  for (const id of ids) {
    result[id] = {
      isFollowing: followingSet.has(id),
      followerCount: countMap[id] ?? 0,
    };
  }

  return NextResponse.json(result);
}
