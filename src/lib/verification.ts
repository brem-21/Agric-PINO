import { prisma } from "@/lib/prisma";

// Verification used to be a paid tier; it isn't anymore. Instead, an account
// becomes *eligible* for (free) verification once it's been part of this many
// completed transactions — activity is the trust signal instead of money. An
// admin still has to approve it (see src/app/api/admin/verifications/route.ts's
// "eligible" view) — this only unlocks the ability to apply.
export const VERIFICATION_TRANSACTION_THRESHOLD = 10;

// ADMIN has no verification tier — every other role does.
export const VERIFICATION_APPLICABLE_ROLES = ["FARMER", "BUYER", "LOGISTICS", "STORAGE_FACILITY"] as const;

export function isVerificationApplicableRole(role: string): boolean {
  return (VERIFICATION_APPLICABLE_ROLES as readonly string[]).includes(role);
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
