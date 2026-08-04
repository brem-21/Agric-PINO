import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatCurrency, formatDate, formatPercent } from "@/lib/utils";
import { Package, ShoppingCart, CheckCircle, DollarSign, TrendingDown, PlusCircle, ExternalLink, Navigation, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WeatherWidget } from "@/components/shared/weather-widget";
import { VerificationStatusCard } from "@/components/shared/verification-status-card";
import { computeLossPercentage, lossColorClass } from "@/lib/post-harvest-loss";
import { getOrGenerateFarmerLossTips } from "@/lib/ai-insights";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "warning" | "success" | "outline"> = {
  PENDING: "warning",
  CONFIRMED: "default",
  PROCESSING: "default",
  READY_FOR_PICKUP: "success",
  IN_TRANSIT: "default",
  DELIVERED: "success",
  CANCELLED: "destructive",
};

const LISTING_STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "warning" | "success" | "outline"> = {
  ACTIVE: "success",
  DRAFT: "secondary",
  SOLD: "default",
  EXPIRED: "destructive",
};

const CATEGORY_EMOJI: Record<string, string> = {
  VEGETABLES: "🥦",
  GRAINS: "🌾",
  TUBERS: "🍠",
  FRUITS: "🍎",
  LEGUMES: "🫘",
  LIVESTOCK: "🐄",
};

export default async function FarmerDashboardPage() {
  const session = await auth();
  if (!session || session.user.role !== "FARMER") redirect("/auth/login");

  const farmerId = session.user.id;

  const [
    activeListings,
    pendingOrders,
    completedOrders,
    paidOrdersAgg,
    recentOrders,
    recentListings,
    lossListings,
    lossBookings,
    user,
    latestVerificationRequest,
  ] = await Promise.all([
    prisma.produceListing.count({ where: { farmerId, status: "ACTIVE" } }),
    prisma.order.count({ where: { farmerId, status: { in: ["PENDING", "CONFIRMED", "PROCESSING"] } } }),
    prisma.order.count({ where: { farmerId, status: "DELIVERED" } }),
    prisma.order.aggregate({
      where: { farmerId, paymentStatus: "PAID" },
      _sum: { totalAmount: true, facilityCommissionAmount: true },
    }),
    prisma.order.findMany({
      where: { farmerId },
      include: {
        listing: { select: { cropType: true, unit: true } },
        buyer: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.produceListing.findMany({
      where: { farmerId },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    prisma.produceListing.findMany({
      where: { farmerId },
      select: {
        quantity: true,
        pricePerUnit: true,
        expiryDate: true,
        createdAt: true,
        orders: { select: { quantity: true, status: true } },
      },
    }),
    prisma.storageBooking.findMany({
      where: { farmerId },
      select: { listingId: true, quantity: true, pricePerUnit: true, status: true, scheduledDropoff: true, createdAt: true },
    }),
    prisma.user.findUnique({ where: { id: farmerId }, select: { isVerified: true, verifiedAt: true } }),
    prisma.verificationRequest.findFirst({
      where: { userId: farmerId },
      orderBy: { createdAt: "desc" },
      select: { status: true },
    }),
  ]);

  // Net of any storage-facility commission — gross sale amount isn't all the
  // farmer's when a sale was routed through a facility (see Order.facilityCommissionAmount).
  const totalEarnings =
    (paidOrdersAgg._sum.totalAmount ?? 0) - (paidOrdersAgg._sum.facilityCommissionAmount ?? 0);

  const lossPercentage = computeLossPercentage(lossListings, { bookings: lossBookings });
  const lossColor = lossColorClass(lossPercentage);

  // Best-effort — a missing/failing OpenRouter call should never break the dashboard.
  const lossTip = await getOrGenerateFarmerLossTips(farmerId).catch(() => null);

  const stats = [
    { label: "Active Listings", value: activeListings, icon: Package, color: "bg-[#eeeee9] text-[#1c3a13]" },
    { label: "Pending Orders", value: pendingOrders, icon: ShoppingCart, color: "bg-[#eeeee9] text-[#1c3a13]" },
    { label: "Completed Orders", value: completedOrders, icon: CheckCircle, color: "bg-[#eeeee9] text-[#1c3a13]" },
    { label: "Total Earnings", value: formatCurrency(totalEarnings), icon: DollarSign, color: "bg-[#d3fa99] text-[#1c3a13]" },
    {
      label: "Post-Harvest Loss",
      caption: "Share of harvest value lost to unsold, expired produce",
      value: lossPercentage === null ? "—" : formatPercent(lossPercentage),
      icon: TrendingDown,
      color: lossColor,
    },
  ];

  return (
    <div className="space-y-8 bg-[#fcfcf7]">
      <VerificationStatusCard
        isVerified={!!user?.isVerified}
        verifiedAt={user?.verifiedAt ?? null}
        latestRequestStatus={latestVerificationRequest?.status ?? null}
      />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light text-[#1c3a13] tracking-tight">Welcome back, {session.user.name?.split(" ")[0]}</h1>
          <p className="text-[#1c3a13]/50 text-sm mt-1">Here&apos;s what&apos;s happening with your farm today.</p>
        </div>
        <Button asChild>
          <Link href="/farmer/listings/new">
            <PlusCircle className="h-4 w-4 mr-2" />
            New Listing
          </Link>
        </Button>
      </div>

      {/* Weather widget */}
      <WeatherWidget />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, caption, value, icon: Icon, color }) => (
          <div key={label} className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] p-6">
            <div className="flex items-start justify-between">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${color}`}>
                <Icon className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold text-[#1c3a13]">{value}</p>
              <p className="text-sm text-[#1c3a13]/50 mt-0.5">{label}</p>
              {caption && <p className="text-xs text-[#1c3a13]/40 mt-1">{caption}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* AI loss-reduction tip */}
      {lossTip && (
        <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] p-5 flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#d3fa99] flex-shrink-0">
            <Sparkles className="h-4 w-4 text-[#1c3a13]" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-[#1c3a13]">Tip to reduce post-harvest loss</p>
            <p className="text-sm text-[#1c3a13]/70 mt-1 whitespace-pre-wrap">{lossTip.content}</p>
          </div>
        </div>
      )}

      {/* Recent Orders */}
      <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#eeeee9]">
          <h2 className="font-medium text-[#1c3a13]">Recent Orders</h2>
          <Link href="/farmer/orders" className="text-sm text-[#1c3a13] hover:underline flex items-center gap-1">
            View all <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <div className="px-6 py-10 text-center text-[#1c3a13]/50 text-sm">No orders yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#eeeee9] bg-[#eeeee9]">
                  <th className="text-left px-6 py-3 font-medium text-[#1c3a13]">Produce</th>
                  <th className="text-left px-6 py-3 font-medium text-[#1c3a13]">Buyer</th>
                  <th className="text-right px-6 py-3 font-medium text-[#1c3a13]">Quantity</th>
                  <th className="text-right px-6 py-3 font-medium text-[#1c3a13]">Amount</th>
                  <th className="text-left px-6 py-3 font-medium text-[#1c3a13]">Status</th>
                  <th className="text-left px-6 py-3 font-medium text-[#1c3a13]">Date</th>
                  <th className="text-right px-6 py-3 font-medium text-[#1c3a13]">Track</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eeeee9]">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-[#eeeee9] transition-colors">
                    <td className="px-6 py-3 font-medium text-[#1c3a13]">{order.listing.cropType}</td>
                    <td className="px-6 py-3 text-[#1c3a13]/70">{order.buyer.name}</td>
                    <td className="px-6 py-3 text-right text-[#1c3a13]/70">
                      {order.quantity} {order.listing.unit}
                    </td>
                    <td className="px-6 py-3 text-right font-medium text-[#1c3a13]">
                      {formatCurrency(order.totalAmount)}
                    </td>
                    <td className="px-6 py-3">
                      <Badge variant={STATUS_VARIANT[order.status] ?? "secondary"}>
                        {order.status === "DELIVERED" ? "Completed" : order.status.replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-[#1c3a13]/50">{formatDate(order.createdAt)}</td>
                    <td className="px-6 py-3 text-right">
                      <Link
                        href={`/tracking/${order.id}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#1c3a13] hover:underline"
                      >
                        <Navigation className="h-3.5 w-3.5" />
                        Track
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Listings */}
      <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#eeeee9]">
          <h2 className="font-medium text-[#1c3a13]">Recent Listings</h2>
          <Link href="/farmer/listings" className="text-sm text-[#1c3a13] hover:underline flex items-center gap-1">
            View all <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
        {recentListings.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-[#1c3a13]/50 text-sm mb-3">You have no listings yet.</p>
            <Button asChild variant="outline" size="sm">
              <Link href="/farmer/listings/new">Create your first listing</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-6">
            {recentListings.map((listing) => (
              <div key={listing.id} className="bg-[#fcfcf7] rounded-xl border border-[#eeeee9] p-4 hover:border-[#1c3a13] transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl" role="img">
                    {CATEGORY_EMOJI[listing.category] ?? "🌿"}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-[#1c3a13] truncate">{listing.cropType}</p>
                    <p className="text-xs text-[#1c3a13]/50">{listing.category}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#1c3a13]">
                    {formatCurrency(listing.pricePerUnit)}/{listing.unit}
                  </span>
                  <Badge variant={LISTING_STATUS_VARIANT[listing.status] ?? "secondary"}>
                    {listing.status}
                  </Badge>
                </div>
                <p className="text-xs text-[#1c3a13]/40 mt-2">
                  {listing.quantity} {listing.unit} available
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
