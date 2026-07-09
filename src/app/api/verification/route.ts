import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { initializePayment } from "@/lib/paystack";
import { VERIFICATION_FEES } from "@/lib/verification";
import { z } from "zod";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, isVerified: true, verifiedAt: true, email: true, phone: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const latestRequest = await prisma.verificationRequest.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    isVerified: user.isVerified,
    verifiedAt: user.verifiedAt,
    fee: VERIFICATION_FEES[user.role] ?? null,
    latestRequest,
  });
}

const submitSchema = z.object({
  ghanaCardNumber: z.string().min(1),
  ghanaCardName: z.string().min(1),
  residenceLocation: z.string().min(1),
  idPhotoFront: z.string().min(1),
  idPhotoBack: z.string().optional(),
  momoPhone: z.string().min(10),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, isVerified: true, email: true, phone: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const fee = VERIFICATION_FEES[user.role];
  if (!fee) return NextResponse.json({ error: "Verification is not applicable to this account type" }, { status: 400 });
  if (user.isVerified) return NextResponse.json({ error: "Account is already verified" }, { status: 409 });

  const pendingRequest = await prisma.verificationRequest.findFirst({
    where: { userId: user.id, status: "PENDING", paymentStatus: "PAID" },
  });
  if (pendingRequest) {
    return NextResponse.json({ error: "You already have a verification request awaiting review" }, { status: 409 });
  }

  try {
    const body = await req.json();
    const data = submitSchema.parse(body);

    const reference = `VERIFY-${user.id}-${Date.now()}`;
    const email = user.email ?? `${user.phone}@lorgric.app`;
    const origin = new URL(req.url).origin;

    const request = await prisma.verificationRequest.create({
      data: {
        userId: user.id,
        role: user.role,
        ghanaCardNumber: data.ghanaCardNumber,
        ghanaCardName: data.ghanaCardName,
        residenceLocation: data.residenceLocation,
        idPhotoFront: data.idPhotoFront,
        idPhotoBack: data.idPhotoBack,
        fee,
        paymentReference: reference,
      },
    });

    const result = await initializePayment({
      email,
      amount: fee,
      reference,
      phone: data.momoPhone.replace(/\s/g, ""),
      provider: "mtn",
      callbackUrl: `${origin}/verification/callback`,
      metadata: { verificationRequestId: request.id },
    });

    return NextResponse.json({ authorizationUrl: result.data.authorization_url, reference });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    console.error("Verification submission error:", error);
    return NextResponse.json({ error: "Failed to start verification payment" }, { status: 500 });
  }
}
