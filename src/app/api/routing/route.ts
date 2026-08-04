import { NextRequest, NextResponse } from "next/server";

export interface RouteOption {
  coordinates: [number, number][]; // [lat, lng] pairs, ready for a Leaflet Polyline
  distanceKm: number;
  durationMin: number;
}

// Server-side proxy to OSRM's free public demo server — no API key, but it's
// a best-effort service (rate-limited to ~1 req/sec, no uptime/SLA guarantee,
// "restricted to reasonable, non-commercial use"). Good enough to show a
// farmer alternate routes to a storage facility; not a production routing
// backend. Proxying server-side (rather than calling OSRM from the browser)
// matches how /api/geocode already proxies Nominatim.
const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fromLat = parseFloat(searchParams.get("fromLat") ?? "");
  const fromLng = parseFloat(searchParams.get("fromLng") ?? "");
  const toLat = parseFloat(searchParams.get("toLat") ?? "");
  const toLng = parseFloat(searchParams.get("toLng") ?? "");

  if ([fromLat, fromLng, toLat, toLng].some((n) => Number.isNaN(n))) {
    return NextResponse.json({ error: "fromLat, fromLng, toLat, toLng are required" }, { status: 400 });
  }

  const url = `${OSRM_BASE}/${fromLng},${fromLat};${toLng},${toLat}?alternatives=true&geometries=geojson&overview=full`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      return NextResponse.json({ error: "Routing service unavailable right now", routes: [] }, { status: 502 });
    }
    const data = await res.json();
    if (data.code !== "Ok" || !Array.isArray(data.routes)) {
      return NextResponse.json({ error: "No route found", routes: [] }, { status: 404 });
    }

    const routes: RouteOption[] = data.routes.map((r: { geometry: { coordinates: [number, number][] }; distance: number; duration: number }) => ({
      // GeoJSON is [lng, lat] — flip to [lat, lng] for Leaflet.
      coordinates: r.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]),
      distanceKm: Math.round((r.distance / 1000) * 10) / 10,
      durationMin: Math.round(r.duration / 60),
    }));

    return NextResponse.json({ routes });
  } catch {
    return NextResponse.json(
      { error: "Routing service is unavailable or too slow right now — try again shortly", routes: [] },
      { status: 502 }
    );
  }
}
