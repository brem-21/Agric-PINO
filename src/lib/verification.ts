import { prisma } from "@/lib/prisma";

// An account becomes *eligible* to apply for (free) verification once it's
// been part of this many completed transactions — activity is the trust
// signal. Anyone who doesn't want to wait can instead pay a flat fee (see
// VERIFICATION_FEES) to unlock the ability to apply immediately — but paying
// only buys the ability to apply sooner, not the badge itself: an admin
// still reviews the Ghana Card photo and approves/rejects either path
// exactly the same way (see src/app/api/admin/verifications/route.ts).
export const VERIFICATION_TRANSACTION_THRESHOLD = 10;

// Note: verification itself no longer gates any action on the platform
// (listing, ordering, accepting jobs, booking storage, making offers all
// work for unverified accounts) — it's a trust badge, not a functional lock.
export const VERIFICATION_FEES: Record<string, number> = {
  FARMER: 50,
  STORAGE_FACILITY: 50,
  LOGISTICS: 30,
  BUYER: 10,
};

// ADMIN has no verification tier — every other role does.
export const VERIFICATION_APPLICABLE_ROLES = ["FARMER", "BUYER", "LOGISTICS", "STORAGE_FACILITY"] as const;

export function isVerificationApplicableRole(role: string): boolean {
  return (VERIFICATION_APPLICABLE_ROLES as readonly string[]).includes(role);
}

export function getVerificationFee(role: string): number {
  return VERIFICATION_FEES[role] ?? 0;
}

/**
 * How many completed transactions this user has been part of, counted per
 * their role's own definition of "completed" — a farmer/buyer's delivered
 * orders, a rider's delivered transport jobs, or a facility's dropped-off
 * bookings. Computed live (no stored counter), consistent with how every
 * other "activity" stat in this app works.
 */
export async function getCompletedTransactionCount(userId: string, role: string): Promise<number> {
  switch (role) {
    case "FARMER":
      return prisma.order.count({ where: { farmerId: userId, status: "DELIVERED" } });
    case "BUYER":
      return prisma.order.count({ where: { buyerId: userId, status: "DELIVERED" } });
    case "LOGISTICS": {
      const profile = await prisma.logisticsProfile.findUnique({ where: { userId }, select: { id: true } });
      if (!profile) return 0;
      return prisma.transportRequest.count({ where: { providerId: profile.id, status: "DELIVERED" } });
    }
    case "STORAGE_FACILITY": {
      const profile = await prisma.storageFacilityProfile.findUnique({ where: { userId }, select: { id: true } });
      if (!profile) return 0;
      return prisma.storageBooking.count({ where: { facilityId: profile.id, status: "DROPPED_OFF" } });
    }
    default:
      return 0;
  }
}
