import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { REPEAT_OFFENDER_THRESHOLD } from "@/lib/complaints";

const complaintSchema = z.object({
  subject: z.string().min(5).max(200),
  category: z.enum([
    "FRAUD",
    "QUALITY_ISSUE",
    "DELIVERY_PROBLEM",
    "PAYMENT_DISPUTE",
    "HARASSMENT",
    "TECHNICAL",
    "OTHER",
  ]),
  description: z.string().min(20).max(2000),
  targetUserId: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const complaints = await prisma.complaint.findMany({
    where: { reporterId: session.user.id },
    select: {
      id: true,
      subject: true,
      category: true,
      description: true,
      status: true,
      adminNotes: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ complaints });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { subject, category, description, targetUserId } = complaintSchema.parse(body);

    if (targetUserId) {
      if (targetUserId === session.user.id) {
        return NextResponse.json({ error: "You cannot report yourself" }, { status: 400 });
      }
      const target = await prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true } });
      if (!target) {
        return NextResponse.json({ error: "Target user not found" }, { status: 400 });
      }
    }

    const complaint = await prisma.complaint.create({
      data: {
        reporterId: session.user.id,
        subject,
        category,
        description,
        targetUserId,
      },
    });

    // Notify all admins and incident-team members
    const moderators = await prisma.user.findMany({
      where: { OR: [{ role: "ADMIN" }, { isIncidentTeam: true }] },
      select: { id: true, role: true },
    });

    if (moderators.length > 0) {
      await prisma.notification.createMany({
        data: moderators.map((m) => ({
          userId: m.id,
          actorId: session.user.id,
          type: "NEW_COMPLAINT",
          title: `New complaint: ${subject}`,
          body: description.slice(0, 100),
          link: m.role === "ADMIN" ? "/admin/complaints" : "/incident-team/complaints",
          entityId: complaint.id,
        })),
      });
    }

    // If this pushes the target user's complaint count to exactly the
    // threshold, proactively flag them for review (rather than relying on
    // someone opening the repeat-offenders table).
    if (targetUserId) {
      const targetCount = await prisma.complaint.count({ where: { targetUserId } });
      if (targetCount === REPEAT_OFFENDER_THRESHOLD && moderators.length > 0) {
        const target = await prisma.user.findUnique({ where: { id: targetUserId }, select: { name: true } });
        await prisma.notification.createMany({
          data: moderators.map((m) => ({
            userId: m.id,
            actorId: session.user.id,
            type: "REPEAT_OFFENDER_FLAGGED",
            title: `${target?.name ?? "A user"} has now been reported ${REPEAT_OFFENDER_THRESHOLD} times`,
            body: "Review recommended — see the repeat offenders table.",
            link: m.role === "ADMIN" ? "/admin/repeat-offenders" : "/incident-team/repeat-offenders",
            entityId: targetUserId,
          })),
        });
      }
    }

    return NextResponse.json({ complaint }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Validation error" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to submit complaint" }, { status: 500 });
  }
}
