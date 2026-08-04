// Auto-approval + price-anomaly detection for new produce listings.
//
// A verified farmer's listing (verification is already required to list at
// all — see POST /api/listings) auto-publishes immediately unless the price
// is a statistical outlier for its category or the farmer has an open
// complaint against them — in which case it's routed to manual review
// instead of sitting in the same queue as every routine listing. This keeps
// the review queue proportional to actual risk instead of every listing,
// which matters because produce spoils in hours-to-days, not the days a
// manual queue can otherwise take to clear.

// Below this many comparable listings, a "median" isn't a meaningful signal
// yet (e.g. a brand-new crop category) — skip the anomaly check rather than
// flag against noise.
const MIN_COMPARABLE_LISTINGS = 3;

// A price more than 50% away from the category median is treated as an
// outlier worth a human's eyes before it reaches buyers (protects buyers from
// scams/typos and farmers from fat-fingered pricing mistakes).
const ANOMALY_BAND = 0.5;

export interface PriceAnomalyResult {
  flagged: boolean;
  median: number | null;
  deviationPct: number | null;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function checkPriceAnomaly(price: number, comparablePrices: number[]): PriceAnomalyResult {
  if (comparablePrices.length < MIN_COMPARABLE_LISTINGS) {
    return { flagged: false, median: null, deviationPct: null };
  }
  const med = median(comparablePrices);
  const deviationPct = med > 0 ? ((price - med) / med) * 100 : 0;
  return { flagged: Math.abs(deviationPct) > ANOMALY_BAND * 100, median: med, deviationPct };
}
