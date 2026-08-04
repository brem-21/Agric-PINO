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
  const canModerate = !!session && (session.user.role === "ADMIN" || session.user.isIncidentTeam);
  if (!canModerate) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { status, adminNotes, assignedToId } = body as {
    status?: string;
    adminNotes?: string;
    assignedToId?: string | null;
  };

  const complaint = await prisma.complaint.findUnique({
    where: { id },
    select: { reporterId: true, subject: true, assignedToId: true },
  });
  if (!complaint) return NextResponse.json({ error: "Complaint not found" }, { status: 404 });

  const data: Record<string, unknown> = {};

  if (status !== undefined) {
    const validStatuses = ["OPEN", "UNDER_REVIEW", "RESOLVED", "DISMISSED"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    data.status = status;
    data.adminNotes = adminNotes ?? undefined;
    if (status === "RESOLVED") {
      data.resolvedAt = new Date();
      data.resolvedById = session!.user.id;
    }
  }

  if (assignedToId !== undefined) {
    // A non-admin incident-team member may only assign the complaint to
    // themselves (self-assign from the unassigned pool) or unassign it —
    // never hand it off to someone else. Admins can assign to anyone.
    if (session!.user.role !== "ADMIN" && assignedToId !== null && assignedToId !== session!.user.id) {
      return NextResponse.json({ error: "You can only assign complaints to yourself" }, { status: 403 });
    }
    data.assignedToId = assignedToId;
  }

  const updated = await prisma.complaint.update({ where: { id }, data });

  if (status && STATUS_LABELS[status]) {
    await prisma.notification.create({
      data: {
        userId: complaint.reporterId,
        actorId: session!.user.id,
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
