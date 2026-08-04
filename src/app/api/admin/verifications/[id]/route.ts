import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
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

  const request = await prisma.verificationRequest.findUnique({ where: { id } });
  if (!request) return NextResponse.json({ error: "Verification request not found" }, { status: 404 });
  if (request.status !== "PENDING") {
    return NextResponse.json({ error: "This request has already been reviewed" }, { status: 409 });
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const updatedRequest = await tx.verificationRequest.update({
        where: { id },
        data: { status, reviewNotes, reviewedById: session.user.id, reviewedAt: new Date() },
      });

      if (status === "APPROVED") {
        await tx.user.update({
          where: { id: request.userId },
          data: {
            isVerified: true,
            verifiedAt: new Date(),
            ghanaCardNumber: request.ghanaCardNumber,
            ghanaCardName: request.ghanaCardName,
            residenceLocation: request.residenceLocation,
          },
        });
      }

      await tx.notification.create({
        data: {
          userId: request.userId,
          actorId: session.user.id,
          type: status === "APPROVED" ? "VERIFICATION_APPROVED" : "VERIFICATION_REJECTED",
          title: status === "APPROVED" ? "Your verification was approved" : "Your verification was rejected",
          body: status === "APPROVED"
            ? "Your identity has been verified. You now have a verified badge on your profile."
            : reviewNotes
              ? `Reason: ${reviewNotes}`
              : "Please review your submitted details and re-apply.",
          link: "/verification",
        },
      });

      return updatedRequest;
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "This Ghana Card number is already registered to another account" },
        { status: 409 }
      );
    }
    console.error("Verification review error:", error);
    return NextResponse.json({ error: "Failed to save review" }, { status: 500 });
  }
}
