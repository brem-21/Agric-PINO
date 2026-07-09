import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getWidgetRecommendations } from "@/lib/recommendations";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "BUYER") {
    return NextResponse.json({ error: "Only buyers get product recommendations" }, { status: 401 });
  }

  const recommendations = await getWidgetRecommendations(session.user.id);
  return NextResponse.json({ recommendations });
}
