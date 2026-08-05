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

export interface CompletedTransactionRow {
  id: string;
  label: string;
  detail: string;
  amount: number | null;
  date: Date;
}

/**
 * Display-ready detail behind getCompletedTransactionCount's number — the
 * actual orders/transactions an admin can check before inviting an eligible
 * user to apply for free verification.
 */
export async function getCompletedTransactionsList(
  userId: string,
  role: string,
  limit = 25
): Promise<CompletedTransactionRow[]> {
  switch (role) {
    case "FARMER": {
      const orders = await prisma.order.findMany({
        where: { farmerId: userId, status: "DELIVERED" },
        select: {
          id: true,
          quantity: true,
          totalAmount: true,
          updatedAt: true,
          buyer: { select: { name: true } },
          listing: { select: { cropType: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: limit,
      });
      return orders.map((o) => ({
        id: o.id,
        label: o.listing.cropType,
        detail: `Sold to ${o.buyer.name} · ${o.quantity} units`,
        amount: o.totalAmount,
        date: o.updatedAt,
      }));
    }
    case "BUYER": {
      const orders = await prisma.order.findMany({
        where: { buyerId: userId, status: "DELIVERED" },
        select: {
          id: true,
          quantity: true,
          totalAmount: true,
          updatedAt: true,
          farmer: { select: { name: true } },
          listing: { select: { cropType: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: limit,
      });
      return orders.map((o) => ({
        id: o.id,
        label: o.listing.cropType,
        detail: `Bought from ${o.farmer.name} · ${o.quantity} units`,
        amount: o.totalAmount,
        date: o.updatedAt,
      }));
    }
    case "LOGISTICS": {
      const profile = await prisma.logisticsProfile.findUnique({ where: { userId }, select: { id: true } });
      if (!profile) return [];
      const jobs = await prisma.transportRequest.findMany({
        where: { providerId: profile.id, status: "DELIVERED" },
        select: { id: true, pickupLocation: true, deliveryLocation: true, actualCost: true, estimatedCost: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: limit,
      });
      return jobs.map((j) => ({
        id: j.id,
        label: `${j.pickupLocation} → ${j.deliveryLocation}`,
        detail: "Delivery job",
        amount: j.actualCost ?? j.estimatedCost ?? null,
        date: j.updatedAt,
      }));
    }
    case "STORAGE_FACILITY": {
      const profile = await prisma.storageFacilityProfile.findUnique({ where: { userId }, select: { id: true } });
      if (!profile) return [];
      const bookings = await prisma.storageBooking.findMany({
        where: { facilityId: profile.id, status: "DROPPED_OFF" },
        select: {
          id: true,
          cropType: true,
          quantity: true,
          unit: true,
          pricePerUnit: true,
          droppedOffAt: true,
          updatedAt: true,
          farmer: { select: { name: true } },
        },
        orderBy: { droppedOffAt: "desc" },
        take: limit,
      });
      return bookings.map((b) => ({
        id: b.id,
        label: b.cropType,
        detail: `Dropped off by ${b.farmer.name} · ${b.quantity} ${b.unit}`,
        amount: b.pricePerUnit * b.quantity,
        date: b.droppedOffAt ?? b.updatedAt,
      }));
    }
    default:
      return [];
  }
}
