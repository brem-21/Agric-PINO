// Server-side IP geolocation via ip-api.com's free JSON endpoint (HTTP only, ~45 req/min
// per caller IP). Results are cached indefinitely per IP since geolocation rarely changes,
// which also keeps repeated admin lookups of the same visitor IP off the rate limit.
export interface IpLookupResult {
  country: string | null;
  regionName: string | null;
  city: string | null;
  isp: string | null;
  org: string | null;
  query: string;
}

const cache = new Map<string, IpLookupResult | null>();

// Private/reserved ranges and placeholders ip-api.com can't resolve — skip the call entirely.
const NOT_LOOKUPABLE =
  /^(unknown|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|localhost)/i;

export async function lookupIp(ip: string): Promise<IpLookupResult | null> {
  const key = ip.trim();
  if (!key || NOT_LOOKUPABLE.test(key)) return null;
  if (cache.has(key)) return cache.get(key)!;

  let result: IpLookupResult | null = null;
  try {
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(key)}?fields=status,country,regionName,city,isp,org,query`
    );
    if (res.ok) {
      const data = await res.json();
      if (data.status === "success") {
        result = {
          country: data.country ?? null,
          regionName: data.regionName ?? null,
          city: data.city ?? null,
          isp: data.isp ?? null,
          org: data.org ?? null,
          query: data.query ?? key,
        };
      }
    }
  } catch {
    // best-effort lookup — cached as a miss below, caller shows "unavailable"
  }

  cache.set(key, result);
  return result;
}
