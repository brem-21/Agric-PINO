import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { lookupIp } from "@/lib/ip-geolocation";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = new URL(req.url).searchParams.get("ip");
  if (!ip) return NextResponse.json({ error: "Missing ip" }, { status: 400 });

  const result = await lookupIp(ip);
  if (!result) return NextResponse.json({ error: "Location unavailable" }, { status: 404 });

  return NextResponse.json(result);
}
