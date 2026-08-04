import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyParties } from "@/lib/notify";
import { z } from "zod";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const request = await prisma.incidentTeamRequest.findUnique({ where: { userId: session.user.id } });
  return NextResponse.json({ isIncidentTeam: session.user.isIncidentTeam, request });
}

const applySchema = z.object({
  reason: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.isIncidentTeam) {
    return NextResponse.json({ error: "You're already on the Incident Team" }, { status: 409 });
  }

  const existing = await prisma.incidentTeamRequest.findUnique({ where: { userId: session.user.id } });
  if (existing && existing.status !== "REJECTED") {
    return NextResponse.json({ error: "You already have an application on file" }, { status: 409 });
  }

  try {
    const { reason } = applySchema.parse(await req.json().catch(() => ({})));

    const request = existing
      ? await prisma.incidentTeamRequest.update({
          where: { userId: session.user.id },
          data: { status: "PENDING", reason, reviewNotes: null, reviewedById: null, reviewedAt: null },
        })
      : await prisma.incidentTeamRequest.create({
          data: { userId: session.user.id, reason },
        });

    const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true, phone: true } });
    if (admins.length > 0) {
      await notifyParties(
        admins.map((a) => ({
          phone: a.phone,
          smsMessage: `Lorgric: ${session.user.name} has applied to join the Incident Team (Macho Men Association).`,
          inApp: {
            userId: a.id,
            actorId: session.user.id,
            type: "INCIDENT_TEAM_APPLICATION",
            title: `New Incident Team application from ${session.user.name}`,
            body: reason ?? "No reason given",
            link: "/admin/incident-team-requests",
          },
        }))
      );
    }

    return NextResponse.json({ request }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to submit application" }, { status: 500 });
  }
}
