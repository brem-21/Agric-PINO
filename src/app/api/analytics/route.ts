import { NextRequest, NextResponse, after } from "next/server";
import { auth } from "@/lib/auth";
import { publishEvent, type EventType } from "@/lib/kafka";
import { prisma } from "@/lib/prisma";
import { formatIp } from "@/lib/utils";
import { reverseGeocode } from "@/lib/geocode";
import { z } from "zod";

const eventSchema = z.object({
  sessionId: z.string().min(1),
  type: z.enum(["page_view", "click", "scroll", "product_view", "farmer_view", "equipment_view", "location_update"]),
  data: z.record(z.string(), z.unknown()).default({}),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const body = await req.json();
    const parsed = eventSchema.parse(body);

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";
    const userAgent = req.headers.get("user-agent") ?? "";

    // Promote common `data` keys into their own columns for SQL querying — `data` itself
    // is still stored in full below so nothing is lost for keys not listed here.
    const raw = parsed.data;
    const location = (raw.location as { lat?: number; lon?: number } | null) ?? null;
    const lat = typeof raw.lat === "number" ? raw.lat : location?.lat ?? null;
    const lon = typeof raw.lon === "number" ? raw.lon : location?.lon ?? null;

    // 1. Write directly to DB — events are never lost even if Kafka is down
    const event = await prisma.userEvent.create({
      data: {
        sessionId: parsed.sessionId,
        userId: session?.user.id ?? null,
        type: parsed.type,
        data: parsed.data as object,
        ip,
        userAgent,
        ipFormatted: formatIp(ip),
        os: typeof raw.os === "string" ? raw.os : null,
        deviceType: typeof raw.deviceType === "string" ? raw.deviceType : null,
        url: typeof raw.url === "string" ? raw.url : null,
        referrer: typeof raw.referrer === "string" ? raw.referrer : null,
        depth: typeof raw.depth === "number" ? raw.depth : null,
        element: typeof raw.element === "string" ? raw.element : null,
        elementText: typeof raw.text === "string" ? raw.text : null,
        href: typeof raw.href === "string" ? raw.href : null,
        trackId: typeof raw.trackId === "string" ? raw.trackId : null,
        accuracy: typeof raw.accuracy === "number" ? raw.accuracy : null,
        lat,
        lon,
      },
    });

    // 2. Also publish to Kafka for the recommendation consumer
    await publishEvent({
      ...parsed,
      type: parsed.type as EventType,
      userId: session?.user.id,
      ip,
      userAgent,
      timestamp: new Date().toISOString(),
    });

    // 3. Reverse-geocode after the response is sent — Nominatim is rate-limited (~1 req/sec)
    // so this must never block event ingestion.
    if (lat !== null && lon !== null) {
      after(async () => {
        try {
          const placeName = await reverseGeocode(lat, lon);
          await prisma.userEvent.update({ where: { id: event.id }, data: { placeName } });
        } catch {
          // best-effort enrichment — never surfaces to the client
        }
      });
    }
  } catch {
    // analytics must never break the app
  }
  return NextResponse.json({ ok: true });
}
