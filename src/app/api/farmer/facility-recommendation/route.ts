import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOrGenerateFacilityRecommendation } from "@/lib/ai-insights";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "FARMER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const recommendation = await getOrGenerateFacilityRecommendation(session.user.id);
    return NextResponse.json(recommendation);
  } catch {
    return NextResponse.json({ error: "Failed to generate recommendation" }, { status: 500 });
  }
}

export async function POST() {
  const session = await auth();
  if (!session || session.user.role !== "FARMER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const recommendation = await getOrGenerateFacilityRecommendation(session.user.id, { force: true });
    return NextResponse.json(recommendation);
  } catch {
    return NextResponse.json({ error: "Failed to generate recommendation" }, { status: 500 });
  }
}
