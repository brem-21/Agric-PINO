import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyParties } from "@/lib/notify";

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
  const { approvalStatus } = body as { approvalStatus?: "APPROVED" | "REJECTED" };

  if (!approvalStatus || !["APPROVED", "REJECTED"].includes(approvalStatus)) {
    return NextResponse.json({ error: "Invalid approvalStatus" }, { status: 400 });
  }

  const facility = await prisma.storageFacilityProfile.findUnique({
    where: { id },
    select: { id: true, userId: true, name: true, user: { select: { phone: true } } },
  });
  if (!facility) return NextResponse.json({ error: "Facility not found" }, { status: 404 });

  const updated = await prisma.storageFacilityProfile.update({
    where: { id },
    data: { approvalStatus },
  });

  const isApproved = approvalStatus === "APPROVED";
  await notifyParties([
    {
      phone: facility.user.phone,
      smsMessage: isApproved
        ? `Lorgric: Your storage facility "${facility.name}" has been approved and is now visible to farmers.`
        : `Lorgric: Your storage facility "${facility.name}" was not approved. Please review and update your details.`,
      inApp: {
        userId: facility.userId,
        actorId: session.user.id,
        type: isApproved ? "FACILITY_APPROVED" : "FACILITY_REJECTED",
        title: isApproved ? "Your facility has been approved" : "Your facility was not approved",
        body: isApproved ? "It's now visible to farmers on the map." : "Please review and update your details.",
        link: "/storage/profile",
      },
    },
  ]);

  return NextResponse.json({ data: updated });
}
