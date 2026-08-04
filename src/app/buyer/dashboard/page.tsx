import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ShoppingCart, Clock, DollarSign, Bookmark, ExternalLink, ShoppingBag, Navigation } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WeatherWidget } from "@/components/shared/weather-widget";
import { RecommendationsPane } from "@/components/shared/recommendations-pane";
import { VerificationStatusCard } from "@/components/shared/verification-status-card";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "warning" | "success" | "outline"> = {
  PENDING: "warning",
  CONFIRMED: "default",
  PROCESSING: "default",
  READY_FOR_PICKUP: "success",
  IN_TRANSIT: "outline",
  DELIVERED: "success",
  CANCELLED: "destructive",
};

export default async function BuyerDashboardPage() {
  const session = await auth();
  if (!session || session.user.role !== "BUYER") redirect("/auth/login");

  const buyerId = session.user.id;

  const [
    totalOrders,
    activeOrders,
    spentAgg,
    recentOrders,
    adminRequest,
    user,
    latestVerificationRequest,
  ] = await Promise.all([
    prisma.order.count({ where: { buyerId } }),
    prisma.order.count({
      where: {
        buyerId,
        status: { in: ["PENDING", "CONFIRMED", "PROCESSING", "READY_FOR_PICKUP", "IN_TRANSIT"] },
      },
    }),
    prisma.order.aggregate({
      where: { buyerId, paymentStatus: "PAID" },
      _sum: { totalAmount: true },
    }),
    prisma.order.findMany({
      where: { buyerId },
      include: {
        listing: { select: { cropType: true, unit: true } },
        farmer: { select: { name: true, farmerProfile: { select: { farmName: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.adminRequest.findUnique({ where: { userId: buyerId }, select: { status: true } }),
    prisma.user.findUnique({ where: { id: buyerId }, select: { isVerified: true, verifiedAt: true } }),
    prisma.verificationRequest.findFirst({
      where: { userId: buyerId },
      orderBy: { createdAt: "desc" },
      select: { status: true },
    }),
  ]);

  const totalSpent = spentAgg._sum.totalAmount ?? 0;

  const stats = [
    { label: "Total Orders", value: totalOrders, icon: ShoppingCart, color: "bg-[#eeeee9] text-[#1c3a13]" },
    { label: "Active Orders", value: activeOrders, icon: Clock, color: "bg-[#eeeee9] text-[#1c3a13]" },
    { label: "Total Spent", value: formatCurrency(totalSpent), icon: DollarSign, color: "bg-[#d3fa99] text-[#1c3a13]" },
    { label: "Saved Listings", value: 0, icon: Bookmark, color: "bg-[#eeeee9] text-[#1c3a13]" },
  ];

  return (
    <div className="space-y-8">
      <RecommendationsPane />
      <VerificationStatusCard
        isVerified={!!user?.isVerified}
        verifiedAt={user?.verifiedAt ?? null}
        latestRequestStatus={latestVerificationRequest?.status ?? null}
      />
      {adminRequest && adminRequest.status !== "APPROVED" && (
        <Link
          href="/admin/pending"
          className={`block rounded-2xl border px-4 py-3 text-sm font-medium transition-colors ${
            adminRequest.status === "REJECTED"
              ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
              : "border-[#d3fa99] bg-[#d3fa99]/40 text-[#1c3a13] hover:bg-[#d3fa99]/60"
          }`}
        >
          {adminRequest.status === "REJECTED"
            ? "Your admin application was not approved — tap for details"
            : "Your admin application is under review — tap for status"}
        </Link>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light tracking-tight text-[#1c3a13]">
            Welcome back, {session.user.name?.split(" ")[0]}
          </h1>
          <p className="text-[#1c3a13]/50 text-sm mt-1">Find fresh produce from farmers across Northern Ghana.</p>
        </div>
        <Button asChild>
          <Link href="/marketplace">
            <ShoppingBag className="h-4 w-4 mr-2" />
            Browse Marketplace
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] p-6">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${color}`}>
              <Icon className="h-6 w-6" />
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold text-[#1c3a13]">{value}</p>
              <p className="text-sm text-[#1c3a13]/50 mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Weather */}
      <WeatherWidget compact />

      {/* Recent Orders */}
      <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#eeeee9]">
          <h2 className="font-medium text-[#1c3a13]">Recent Orders</h2>
          <Link href="/buyer/orders" className="text-sm text-[#1c3a13] hover:underline flex items-center gap-1">
            View all <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-[#1c3a13]/50 text-sm mb-4">You haven&apos;t placed any orders yet.</p>
            <Button asChild variant="outline">
              <Link href="/marketplace">Browse Produce</Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#eeeee9] bg-[#eeeee9]">
                  <th className="text-left px-6 py-3 font-medium text-[#1c3a13]">Produce</th>
                  <th className="text-left px-6 py-3 font-medium text-[#1c3a13]">Farmer</th>
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
                    <td className="px-6 py-3 text-[#1c3a13]/70">
                      {order.farmer.farmerProfile?.farmName ?? order.farmer.name}
                    </td>
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
    </div>
  );
}
