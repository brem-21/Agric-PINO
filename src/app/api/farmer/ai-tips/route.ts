import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOrGenerateFarmerLossTips } from "@/lib/ai-insights";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "FARMER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tip = await getOrGenerateFarmerLossTips(session.user.id);
    return NextResponse.json(tip);
  } catch {
    return NextResponse.json({ error: "Failed to generate tips" }, { status: 500 });
  }
}
