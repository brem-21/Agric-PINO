import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const MAX_VERIFY_ATTEMPTS = 5;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = z
    .object({ phone: z.string().min(10), code: z.string().length(6) })
    .safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { phone, code } = parsed.data;
  const now = new Date();

  const otp = await prisma.otpCode.findFirst({
    where: { phone, used: false, expiresAt: { gt: now } },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) {
    return NextResponse.json(
      { error: "Code expired or not found. Request a new one." },
      { status: 400 }
    );
  }

  // A 6-digit code is brute-forceable with unlimited guesses — cap attempts
  // per code and force a fresh send (which is itself rate-limited) past that.
  if (otp.attempts >= MAX_VERIFY_ATTEMPTS) {
    await prisma.otpCode.update({ where: { id: otp.id }, data: { used: true } });
    return NextResponse.json(
      { error: "Too many incorrect attempts. Please request a new code." },
      { status: 429 }
    );
  }

  if (otp.code !== code) {
    await prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    return NextResponse.json({ error: "Incorrect code. Please try again." }, { status: 400 });
  }

  await prisma.otpCode.update({ where: { id: otp.id }, data: { used: true } });

  return NextResponse.json({ valid: true });
}
