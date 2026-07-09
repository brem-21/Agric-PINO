import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { reverseGeocode } from "@/lib/geocode";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lng = parseFloat(searchParams.get("lng") ?? "");
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
  }

  const place = await reverseGeocode(lat, lng);
  return NextResponse.json({ place });
}
