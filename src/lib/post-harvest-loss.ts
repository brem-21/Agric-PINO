export interface LossListingInput {
  quantity: number;
  pricePerUnit: number;
  expiryDate: Date | null;
  createdAt: Date;
  orders: { quantity: number; status: string }[];
}

// A storage booking not yet linked to a marketplace listing (listingId is
// only set once the facility marks it DROPPED_OFF and a listing exists to
// carry the value from then on) — tracked separately so its value isn't
// double-counted once it does get a listing.
export interface LossBookingInput {
  listingId: string | null;
  quantity: number;
  pricePerUnit: number;
  status: string;
  scheduledDropoff: Date;
  createdAt: Date;
}

// A CONFIRMED booking whose scheduled drop-off is more than this many days
// past due, with produce still never actually handed to the facility, is
// treated as a missed harvest-to-storage window rather than an in-progress one.
const MISSED_DROPOFF_GRACE_DAYS = 3;

// Post-harvest loss %, by value rather than raw quantity (crops are listed in
// different units — kg, bags, crates — so summing quantity directly across
// listings isn't meaningful, but GHS value is). ProduceListing.quantity is a
// live "remaining stock" counter (decremented per order), not the amount
// originally listed, so the original amount is reconstructed as remaining +
// sum of every order ever placed against that listing.
//
// Three independent loss signals feed the total, each catching a different
// point where produce actually goes to waste:
//  1. Unsold stock whose listing has passed its expiry date — the direct case.
//  2. A cancelled order's quantity — that stock was decremented from the
//     listing at order time and nothing in this codebase restocks it on
//     cancellation, so it's value that left the marketplace and never sold.
//  3. A storage booking confirmed for drop-off but never actually dropped off
//     within a grace window of its scheduled date — the farmer arranged the
//     one intervention (cold-chain/hermetic storage) built to prevent loss,
//     and it never happened, which is itself a real-world loss event even
//     though no ProduceListing was ever created to record it.
export function computeLossPercentage(
  listings: LossListingInput[],
  opts?: { monthOnly?: boolean; bookings?: LossBookingInput[] }
): number | null {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  let harvestedValue = 0;
  let lostValue = 0;
  for (const listing of listings) {
    if (opts?.monthOnly && listing.createdAt < monthStart) continue;
    const soldQuantity = listing.orders.reduce((sum, o) => sum + o.quantity, 0);
    const originalQuantity = listing.quantity + soldQuantity;
    harvestedValue += originalQuantity * listing.pricePerUnit;

    if (listing.expiryDate && listing.expiryDate < now) {
      lostValue += listing.quantity * listing.pricePerUnit;
    }

    const cancelledQuantity = listing.orders
      .filter((o) => o.status === "CANCELLED")
      .reduce((sum, o) => sum + o.quantity, 0);
    lostValue += cancelledQuantity * listing.pricePerUnit;
  }

  const graceMs = MISSED_DROPOFF_GRACE_DAYS * 24 * 60 * 60 * 1000;
  for (const booking of opts?.bookings ?? []) {
    if (booking.listingId) continue; // already carried by the listings loop above
    if (opts?.monthOnly && booking.createdAt < monthStart) continue;
    const bookingValue = booking.quantity * booking.pricePerUnit;
    harvestedValue += bookingValue;
    if (booking.status === "CONFIRMED" && now.getTime() - booking.scheduledDropoff.getTime() > graceMs) {
      lostValue += bookingValue;
    }
  }

  return harvestedValue > 0 ? (lostValue / harvestedValue) * 100 : null;
}

export function lossColorClass(lossPercentage: number | null): string {
  return lossPercentage === null
    ? "bg-[#eeeee9] text-[#1c3a13]"
    : lossPercentage < 10
    ? "bg-[#d3fa99] text-[#1c3a13]"
    : lossPercentage < 25
    ? "bg-amber-100 text-amber-700"
    : "bg-red-100 text-red-700";
}
