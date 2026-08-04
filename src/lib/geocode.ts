// Server-side reverse geocoding via OpenStreetMap Nominatim.
// Nominatim's usage policy caps requests at 1/sec and requires an identifying User-Agent
// for non-browser callers, so lookups are cached and funneled through a single queue.
const cache = new Map<string, string>();
const MIN_INTERVAL_MS = 1100;
let queue: Promise<unknown> = Promise.resolve();
let lastCallAt = 0;

function roundCoord(n: number): number {
  return Math.round(n * 100) / 100; // ~1.1km buckets, groups nearby events onto one lookup
}

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const wait = Math.max(0, MIN_INTERVAL_MS - (Date.now() - lastCallAt));
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastCallAt = Date.now();
    return fn();
  });
  queue = run.catch(() => {});
  return run;
}

async function fetchPlaceName(lat: number, lon: number): Promise<string> {
  const fallback = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`,
      {
        headers: {
          "User-Agent": "Lorgric-Admin/1.0 (contact: admin@lorgric.com)",
          "Accept-Language": "en",
        },
      }
    );
    if (!res.ok) return fallback;
    const data = await res.json();
    const addr = data.address ?? {};
    const neighbourhood = addr.suburb ?? addr.neighbourhood ?? addr.town ?? addr.village ?? addr.hamlet ?? "";
    const cityOrRegion = addr.city ?? addr.county ?? addr.state_district ?? addr.state ?? "";
    const parts = [neighbourhood, neighbourhood !== cityOrRegion ? cityOrRegion : ""].filter(Boolean);
    return parts.join(", ") || data.display_name || fallback;
  } catch {
    return fallback;
  }
}

export async function reverseGeocode(lat: number, lon: number): Promise<string> {
  const key = `${roundCoord(lat)},${roundCoord(lon)}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const result = await enqueue(() => fetchPlaceName(lat, lon));
  cache.set(key, result);
  return result;
}

export interface GeocodeResult {
  lat: number;
  lon: number;
  displayName: string;
}

const forwardCache = new Map<string, GeocodeResult | null>();

async function fetchCoordinates(query: string): Promise<GeocodeResult | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=gh`,
      {
        headers: {
          "User-Agent": "Lorgric-Admin/1.0 (contact: admin@lorgric.com)",
          "Accept-Language": "en",
        },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const hit = data[0];
    if (!hit) return null;
    return { lat: parseFloat(hit.lat), lon: parseFloat(hit.lon), displayName: hit.display_name };
  } catch {
    return null;
  }
}

// Forward geocoding — turns a free-text address (typed, not picked on a map
// or from GPS) into coordinates, so a transport request built from plain text
// still gets a distance/fare estimate instead of silently showing none.
export async function forwardGeocode(query: string): Promise<GeocodeResult | null> {
  const key = query.trim().toLowerCase();
  if (!key) return null;
  if (forwardCache.has(key)) return forwardCache.get(key)!;

  const result = await enqueue(() => fetchCoordinates(key));
  forwardCache.set(key, result);
  return result;
}
