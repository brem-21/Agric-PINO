import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendTestRecommendationSMS } from "@/lib/recommendations";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { phone } = await req.json();
  if (!phone) return NextResponse.json({ error: "phone required" }, { status: 400 });

  const result = await sendTestRecommendationSMS(phone);
  return NextResponse.json(result);
}
