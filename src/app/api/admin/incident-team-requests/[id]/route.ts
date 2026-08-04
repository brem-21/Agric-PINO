import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyParties } from "@/lib/notify";
import { z } from "zod";

const patchSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  reviewNotes: z.string().optional(),
});

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
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { status, reviewNotes } = parsed.data;

  const request = await prisma.incidentTeamRequest.findUnique({
    where: { id },
    include: { user: { select: { name: true, phone: true } } },
  });
  if (!request) return NextResponse.json({ error: "Application not found" }, { status: 404 });
  if (request.status !== "PENDING") {
    return NextResponse.json({ error: "This application has already been reviewed" }, { status: 409 });
  }

  const updated = await prisma.incidentTeamRequest.update({
    where: { id },
    data: { status, reviewNotes, reviewedById: session.user.id, reviewedAt: new Date() },
  });

  // Approval only sets the add-on flag — the applicant's primary role and
  // dashboard are untouched, unlike AdminRequest which converts the role outright.
  if (status === "APPROVED") {
    await prisma.user.update({ where: { id: request.userId }, data: { isIncidentTeam: true } });
  }

  await notifyParties([
    {
      phone: request.user.phone,
      smsMessage:
        status === "APPROVED"
          ? "Lorgric: You've been approved for the Incident Team (Macho Men Association)! Log out and back in to access it."
          : `Lorgric: Your Incident Team application was not approved.${reviewNotes ? ` Reason: ${reviewNotes}` : ""}`,
      inApp: {
        userId: request.userId,
        actorId: session.user.id,
        type: status === "APPROVED" ? "INCIDENT_TEAM_APPROVED" : "INCIDENT_TEAM_REJECTED",
        title: status === "APPROVED" ? "You're now a Macho" : "Incident Team application not approved",
        body:
          status === "APPROVED"
            ? "Log out and log back in to access the Incident Team portal."
            : reviewNotes ?? "You can apply again from your profile.",
        link: status === "APPROVED" ? "/incident-team" : "/incident-team/apply",
      },
    },
  ]);

  return NextResponse.json({ data: updated });
}
