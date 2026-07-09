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

  const request = await prisma.adminRequest.findUnique({
    where: { id },
    include: { user: { select: { name: true, phone: true } } },
  });
  if (!request) return NextResponse.json({ error: "Admin request not found" }, { status: 404 });
  if (request.status !== "PENDING") {
    return NextResponse.json({ error: "This request has already been reviewed" }, { status: 409 });
  }
  if (request.userId === session.user.id) {
    return NextResponse.json({ error: "You cannot review your own application" }, { status: 400 });
  }

  const updated = await prisma.adminRequest.update({
    where: { id },
    data: { status, reviewNotes, reviewedById: session.user.id, reviewedAt: new Date() },
  });

  // Approval is the actual conversion from customer (BUYER) to ADMIN. Rejection
  // leaves them exactly as they were — full buyer access, no admin powers.
  if (status === "APPROVED") {
    await prisma.user.update({ where: { id: request.userId }, data: { role: "ADMIN" } });
  }

  await notifyParties([
    {
      phone: request.user.phone,
      smsMessage:
        status === "APPROVED"
          ? "Lorgric: Your admin application has been approved! Log out and log back in to access the admin dashboard."
          : `Lorgric: Your admin application was not approved. You still have full access as a customer.${reviewNotes ? ` Reason: ${reviewNotes}` : ""}`,
      inApp: {
        userId: request.userId,
        actorId: session.user.id,
        type: status === "APPROVED" ? "ADMIN_APPROVED" : "ADMIN_REJECTED",
        title: status === "APPROVED" ? "Your admin account was approved" : "Your admin application was not approved",
        body:
          status === "APPROVED"
            ? "Log out and log back in to access the admin dashboard."
            : reviewNotes ?? "You still have full access as a customer. Contact an existing admin for details.",
        link: status === "APPROVED" ? "/auth/login" : "/admin/pending",
      },
    },
  ]);

  return NextResponse.json({ data: updated });
}
