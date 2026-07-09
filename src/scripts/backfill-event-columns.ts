// One-off backfill: populates the promoted UserEvent columns (added in the
// add_derived_event_columns migration) for rows written before that migration existed.
import { config } from "dotenv";
import { formatIp } from "../lib/utils";
import { reverseGeocode } from "../lib/geocode";

async function main() {
  // lib/prisma reads process.env.DATABASE_URL at import time, so config() must run — and
  // this dynamic import must happen — before that module is ever evaluated (static imports
  // are hoisted above this call and would see DATABASE_URL as unset).
  config({ path: ".env.local" });
  const { prisma } = await import("../lib/prisma");

  const rows = await prisma.userEvent.findMany({ where: { ipFormatted: null } });
  console.log(`[Backfill] ${rows.length} events to update`);

  for (const row of rows) {
    const raw = (row.data as Record<string, unknown>) ?? {};
    const nested = (raw.location as { lat?: number; lon?: number } | null) ?? {};
    const lat = typeof raw.lat === "number" ? raw.lat : nested.lat ?? null;
    const lon = typeof raw.lon === "number" ? raw.lon : nested.lon ?? null;

    const placeName = lat !== null && lon !== null ? await reverseGeocode(lat, lon) : null;

    await prisma.userEvent.update({
      where: { id: row.id },
      data: {
        ipFormatted: formatIp(row.ip),
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
        placeName,
      },
    });
  }

  console.log("[Backfill] done");
  process.exit(0);
}

main().catch((err) => {
  console.error("[Backfill] failed:", err);
  process.exit(1);
});
