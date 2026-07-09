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
