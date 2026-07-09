import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

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
    const { subject, category, description } = complaintSchema.parse(body);

    const complaint = await prisma.complaint.create({
      data: {
        reporterId: session.user.id,
        subject,
        category,
        description,
      },
    });

    // Notify all admins
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });

    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map((a) => ({
          userId: a.id,
          actorId: session.user.id,
          type: "NEW_COMPLAINT",
          title: `New complaint: ${subject}`,
          body: description.slice(0, 100),
          link: "/admin/complaints",
          entityId: complaint.id,
        })),
      });
    }

    return NextResponse.json({ complaint }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Validation error" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to submit complaint" }, { status: 500 });
  }
}
