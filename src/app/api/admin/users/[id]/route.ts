import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyParties } from "@/lib/notify";

const USER_SELECT = {
  id: true,
  name: true,
  phone: true,
  email: true,
  image: true,
  role: true,
  region: true,
  district: true,
  isActive: true,
  isVerified: true,
  verifiedAt: true,
  ghanaCardNumber: true,
  ghanaCardName: true,
  residenceLocation: true,
  createdAt: true,
  lastSeen: true,
  farmerProfile: true,
  buyerProfile: true,
  logisticsProfile: true,
  storageFacilityProfile: true,
  _count: { select: { listings: true, buyerOrders: true, farmerOrders: true, complaints: true } },
} as const;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id }, select: USER_SELECT });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({ data: user });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { isVerified, isActive, role } = body as { isVerified?: boolean; isActive?: boolean; role?: string };

  if (role !== undefined && role !== "ADMIN") {
    return NextResponse.json({ error: "This action only supports promoting a user to ADMIN" }, { status: 400 });
  }
  if (role === "ADMIN") {
    const target = await prisma.user.findUnique({ where: { id }, select: { role: true, phone: true } });
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (target.role === "ADMIN") {
      return NextResponse.json({ error: "This user is already an admin" }, { status: 400 });
    }
  }

  const updateData: Record<string, unknown> = {};
  if (isVerified !== undefined) {
    updateData.isVerified = isVerified;
    updateData.verifiedAt = isVerified ? new Date() : null;
  }
  if (isActive !== undefined) updateData.isActive = isActive;
  if (role === "ADMIN") updateData.role = "ADMIN";

  const user = await prisma.user.update({ where: { id }, data: updateData, select: USER_SELECT });

  if (isVerified === true) {
    await prisma.notification.create({
      data: {
        userId: id,
        actorId: session.user.id,
        type: "VERIFIED",
        title: "Your account has been verified",
        body: "Your identity has been verified by a Lorgric admin. You now have full access.",
        link: "/",
      },
    });
  }

  if (role === "ADMIN") {
    await notifyParties([
      {
        phone: user.phone,
        smsMessage: "Lorgric: You've been made an admin! Log out and log back in to access the admin dashboard.",
        inApp: {
          userId: id,
          actorId: session.user.id,
          type: "ADMIN_APPROVED",
          title: "You've been made an admin",
          body: "Log out and log back in to access the admin dashboard.",
          link: "/admin",
        },
      },
    ]);
  }

  return NextResponse.json({ data: user });
}
