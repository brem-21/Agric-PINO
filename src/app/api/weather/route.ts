import { NextRequest, NextResponse } from "next/server";
import { getWeather } from "@/lib/weather";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lon = parseFloat(searchParams.get("lon") ?? "");

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json({ error: "lat and lon are required" }, { status: 400 });
  }

  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  try {
    const weather = await getWeather(lat, lon);
    return NextResponse.json(weather, {
      // 15-minute browser cache, stale-while-revalidate keeps it snappy on re-visits
      headers: { "Cache-Control": "public, max-age=900, stale-while-revalidate=300" },
    });
  } catch {
    return NextResponse.json({ error: "Weather service unavailable" }, { status: 503 });
  }
}
