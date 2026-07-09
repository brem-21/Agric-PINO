import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendSMS } from "@/lib/mnotify";
import { z } from "zod";

const MAX_SENDS_PER_WINDOW = 5;
const SEND_WINDOW_MS = 15 * 60 * 1000;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = z.object({ phone: z.string().min(10) }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Valid phone number required" }, { status: 400 });
  }

  const { phone } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) {
    return NextResponse.json({ error: "Phone number already registered" }, { status: 400 });
  }

  // Rate-limit by phone regardless of account existence — caps both OTP spam
  // and SMS-credit burn from repeated resends.
  const recentSends = await prisma.otpCode.count({
    where: { phone, createdAt: { gte: new Date(Date.now() - SEND_WINDOW_MS) } },
  });
  if (recentSends >= MAX_SENDS_PER_WINDOW) {
    return NextResponse.json(
      { error: "Too many codes requested. Please wait 15 minutes and try again." },
      { status: 429 }
    );
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  // Invalidate (not delete) any previous outstanding code for this phone —
  // only the newest code should ever verify, and keeping the row around lets
  // the count above see the full send history for this window.
  await prisma.otpCode.updateMany({ where: { phone, used: false }, data: { used: true } });
  await prisma.otpCode.create({ data: { phone, code, expiresAt } });

  if (!process.env.MNOTIFY_API_KEY) {
    console.error(`[otp/send] MNOTIFY_API_KEY is not configured — cannot send OTP to ${phone}`);
    if (process.env.NODE_ENV === "development") {
      return NextResponse.json({ ok: true, smsSent: false, devCode: code });
    }
    return NextResponse.json({ error: "SMS service is not configured" }, { status: 500 });
  }

  try {
    await sendSMS({
      to: phone,
      message: `Lorgric: Your verification code is ${code}. Valid for 10 minutes. Do not share this code.`,
    });
  } catch (error) {
    console.error(`[otp/send] Failed to send OTP SMS to ${phone}:`, error);
    if (process.env.NODE_ENV === "development") {
      return NextResponse.json({ ok: true, smsSent: false, devCode: code });
    }
    return NextResponse.json(
      { error: "Failed to send SMS. Check your phone number." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, smsSent: true });
}
