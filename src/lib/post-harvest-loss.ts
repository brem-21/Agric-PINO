export interface LossListingInput {
  quantity: number;
  pricePerUnit: number;
  expiryDate: Date | null;
  createdAt: Date;
  orders: { quantity: number }[];
}

// Post-harvest loss %, by value rather than raw quantity (crops are listed in
// different units — kg, bags, crates — so summing quantity directly across
// listings isn't meaningful, but GHS value is). ProduceListing.quantity is a
// live "remaining stock" counter (decremented per order), not the amount
// originally listed, so the original amount is reconstructed as remaining +
// sum of every order ever placed against that listing. A listing counts as
// "lost" once its expiry date has passed with stock still unsold — nothing
// in this codebase auto-flips a listing to EXPIRED, so this is computed
// directly from expiryDate rather than relying on listing.status.
export function computeLossPercentage(
  listings: LossListingInput[],
  opts?: { monthOnly?: boolean }
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
