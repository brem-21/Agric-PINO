import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
  const { approvalStatus, approvalNotes } = body as {
    approvalStatus?: "APPROVED" | "REJECTED";
    approvalNotes?: string;
  };

  if (!approvalStatus || !["APPROVED", "REJECTED"].includes(approvalStatus)) {
    return NextResponse.json({ error: "Invalid approvalStatus" }, { status: 400 });
  }

  const listing = await prisma.produceListing.findUnique({
    where: { id },
    select: { id: true, farmerId: true, cropType: true },
  });
  if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });

  const updated = await prisma.produceListing.update({
    where: { id },
    data: {
      approvalStatus,
      approvalNotes: approvalNotes ?? null,
      status: approvalStatus === "APPROVED" ? "ACTIVE" : "DRAFT",
    },
  });

  const isApproved = approvalStatus === "APPROVED";
  await prisma.notification.create({
    data: {
      userId: listing.farmerId,
      actorId: session.user.id,
      type: isApproved ? "LISTING_APPROVED" : "LISTING_REJECTED",
      title: isApproved
        ? `Your listing "${listing.cropType}" has been approved`
        : `Your listing "${listing.cropType}" was not approved`,
      body: approvalNotes ?? (isApproved ? "It is now live on the marketplace." : "Please review and resubmit."),
      link: isApproved ? `/marketplace/${id}` : `/farmer/listings`,
      entityId: id,
    },
  });

  return NextResponse.json({ data: updated });
}
