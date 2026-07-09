import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const STATUS_LABELS: Record<string, string> = {
  UNDER_REVIEW: "Your complaint is now under review",
  RESOLVED: "Your complaint has been resolved",
  DISMISSED: "Your complaint has been dismissed",
};

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
  const { status, adminNotes } = body as { status?: string; adminNotes?: string };

  const validStatuses = ["OPEN", "UNDER_REVIEW", "RESOLVED", "DISMISSED"];
  if (!status || !validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const complaint = await prisma.complaint.findUnique({
    where: { id },
    select: { reporterId: true, subject: true },
  });
  if (!complaint) return NextResponse.json({ error: "Complaint not found" }, { status: 404 });

  const updated = await prisma.complaint.update({
    where: { id },
    data: {
      status: status as never,
      adminNotes: adminNotes ?? undefined,
      ...(status === "RESOLVED" && {
        resolvedAt: new Date(),
        resolvedById: session.user.id,
      }),
    },
  });

  if (STATUS_LABELS[status]) {
    await prisma.notification.create({
      data: {
        userId: complaint.reporterId,
        actorId: session.user.id,
        type: "COMPLAINT_UPDATE",
        title: STATUS_LABELS[status],
        body: adminNotes ?? `Re: "${complaint.subject}"`,
        link: "/",
        entityId: id,
      },
    });
  }

  return NextResponse.json({ data: updated });
}
