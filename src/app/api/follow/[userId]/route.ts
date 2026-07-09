import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const session = await auth();
  const { userId } = await params;

  const followerCount = await prisma.follow.count({ where: { followingId: userId } });
  const isFollowing = session
    ? !!(await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: session.user.id, followingId: userId } },
      }))
    : false;

  return NextResponse.json({ followerCount, isFollowing });
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { userId } = await params;
  if (userId === session.user.id) return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });

  await prisma.follow.upsert({
    where: { followerId_followingId: { followerId: session.user.id, followingId: userId } },
    create: { followerId: session.user.id, followingId: userId },
    update: {},
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { userId } = await params;

  await prisma.follow.deleteMany({
    where: { followerId: session.user.id, followingId: userId },
  });

  return NextResponse.json({ ok: true });
}
