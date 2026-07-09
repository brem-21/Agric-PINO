import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatIp } from "@/lib/utils";
import { reverseGeocode } from "@/lib/geocode";
import { resolveRange } from "@/lib/analytics-range";
import type { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const range = searchParams.get("range");
  const location = searchParams.get("location");
  const role = searchParams.get("role");
  const os = searchParams.get("os");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(20, parseInt(searchParams.get("limit") ?? "15"));

  const where: Prisma.UserEventWhereInput = {
    ...(type && { type }),
    ...(location && { placeName: location }),
    ...(role && { user: { role: role as never } }),
    ...(os && { os }),
  };
  if (range) {
    const { from, to } = resolveRange(range, searchParams.get("from"), searchParams.get("to"));
    where.createdAt = { gte: from, lte: to };
  }

  const [events, total] = await Promise.all([
    prisma.userEvent.findMany({
      where,
      select: {
        id: true,
        sessionId: true,
        userId: true,
        type: true,
        data: true,
        ip: true,
        ipFormatted: true,
        userAgent: true,
        createdAt: true,
        os: true,
        deviceType: true,
        url: true,
        referrer: true,
        depth: true,
        element: true,
        elementText: true,
        href: true,
        trackId: true,
        accuracy: true,
        lat: true,
        lon: true,
        placeName: true,
        user: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.userEvent.count({ where }),
  ]);

  const PROMOTED_KEYS = new Set([
    "os", "deviceType", "url", "referrer", "depth", "element", "text", "href", "trackId", "accuracy", "lat", "lon", "location",
  ]);

  // Prefer the promoted columns written at ingestion; fall back to parsing raw `data` for
  // rows created before this migration (their promoted columns are null).
  const rows = events.map((e) => {
    const raw = (e.data as Record<string, unknown>) ?? {};
    const nested = (raw.location as { lat?: number; lon?: number } | null) ?? {};

    const columns: Record<string, unknown> = {
      os: e.os ?? raw.os ?? null,
      deviceType: e.deviceType ?? raw.deviceType ?? null,
      url: e.url ?? raw.url ?? null,
      referrer: e.referrer ?? raw.referrer ?? null,
      depth: e.depth ?? raw.depth ?? null,
      element: e.element ?? raw.element ?? null,
      elementText: e.elementText ?? raw.text ?? null,
      href: e.href ?? raw.href ?? null,
      trackId: e.trackId ?? raw.trackId ?? null,
      accuracy: e.accuracy ?? raw.accuracy ?? null,
    };
    for (const k of Object.keys(columns)) if (columns[k] === null) delete columns[k];

    // Any keys not covered by a promoted column (future/unlisted event data) still surface here.
    for (const [k, v] of Object.entries(raw)) {
      if (!PROMOTED_KEYS.has(k) && !(k in columns)) columns[k] = v;
    }

    const lat = e.lat ?? (typeof raw.lat === "number" ? raw.lat : nested.lat) ?? null;
    const lon = e.lon ?? (typeof raw.lon === "number" ? raw.lon : nested.lon) ?? null;

    return {
      id: e.id,
      createdAt: e.createdAt,
      type: e.type,
      sessionId: e.sessionId,
      userId: e.userId,
      userName: e.user?.name ?? null,
      ip: e.ipFormatted ?? formatIp(e.ip),
      userAgent: e.userAgent,
      columns,
      lat,
      lon,
      place: e.placeName,
    };
  });

  // Rows missing a persisted placeName (legacy rows, or the async enrichment hasn't landed
  // yet) are geocoded on the fly — deduped per distinct coordinate via lib/geocode's cache.
  const distinctCoords = new Map<string, { lat: number; lon: number }>();
  for (const r of rows) {
    if (r.place === null && r.lat !== null && r.lon !== null) {
      distinctCoords.set(`${r.lat},${r.lon}`, { lat: r.lat, lon: r.lon });
    }
  }
  const places = new Map<string, string>();
  for (const [key, { lat, lon }] of distinctCoords) {
    places.set(key, await reverseGeocode(lat, lon));
  }
  for (const r of rows) {
    if (r.place === null && r.lat !== null && r.lon !== null) r.place = places.get(`${r.lat},${r.lon}`) ?? null;
  }

  return NextResponse.json({
    data: rows,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}
