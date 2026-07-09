import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Truck, CheckCircle, DollarSign, Star, MapPin, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VerificationStatusCard } from "@/components/shared/verification-status-card";

const TRANSPORT_STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "warning" | "success" | "outline"> = {
  PENDING: "warning",
  ASSIGNED: "default",
  PICKED_UP: "outline",
  IN_TRANSIT: "outline",
  DELIVERED: "success",
  CANCELLED: "destructive",
};

async function acceptTransportRequest(requestId: string) {
  "use server";
  const { prisma: db } = await import("@/lib/prisma");
  const { auth: getAuth } = await import("@/lib/auth");
  const session = await getAuth();
  if (!session) return;
  if (!session.user.isVerified) return;

  const logisticsProfile = await db.logisticsProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!logisticsProfile) return;

  await db.transportRequest.update({
    where: { id: requestId },
    data: { status: "ASSIGNED", providerId: logisticsProfile.id },
  });

  const { revalidatePath } = await import("next/cache");
  revalidatePath("/logistics/dashboard");
}

export default async function LogisticsDashboardPage() {
  const session = await auth();
  if (!session || session.user.role !== "LOGISTICS") redirect("/auth/login");

  const logisticsProfile = await prisma.logisticsProfile.findUnique({
    where: { userId: session.user.id },
  });

  const providerId = logisticsProfile?.id;

  const [
    activeDeliveries,
    completedDeliveries,
    earningsAgg,
    pendingRequests,
    user,
    latestVerificationRequest,
  ] = await Promise.all([
    providerId
      ? prisma.transportRequest.count({
          where: { providerId, status: { in: ["ASSIGNED", "PICKED_UP", "IN_TRANSIT"] } },
        })
      : 0,
    providerId
      ? prisma.transportRequest.count({ where: { providerId, status: "DELIVERED" } })
      : 0,
    providerId
      ? prisma.transportRequest.aggregate({
          where: { providerId, status: "DELIVERED" },
          _sum: { actualCost: true },
        })
      : { _sum: { actualCost: null } },
    prisma.transportRequest.findMany({
      where: { status: "PENDING" },
      include: {
        requester: { select: { name: true, phone: true } },
        order: {
          include: {
            listing: { select: { cropType: true, unit: true, quantity: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { isVerified: true, verifiedAt: true } }),
    prisma.verificationRequest.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: { status: true, paymentStatus: true },
    }),
  ]);

  const totalEarnings = (earningsAgg._sum as { actualCost: number | null }).actualCost ?? 0;
  const rating = logisticsProfile?.rating ?? 0;

  const stats = [
    { label: "Active Deliveries", value: activeDeliveries, icon: Truck, color: "bg-[#eeeee9] text-[#1c3a13]" },
    { label: "Completed", value: completedDeliveries, icon: CheckCircle, color: "bg-[#d3fa99] text-[#1c3a13]" },
    { label: "Total Earnings", value: formatCurrency(totalEarnings), icon: DollarSign, color: "bg-[#eeeee9] text-[#1c3a13]" },
    { label: "Rating", value: `${rating.toFixed(1)} / 5`, icon: Star, color: "bg-[#eeeee9] text-[#1c3a13]" },
  ];

  const isVerified = !!user?.isVerified;

  return (
    <div className="space-y-8">
      <VerificationStatusCard
        isVerified={isVerified}
        verifiedAt={user?.verifiedAt ?? null}
        latestRequestStatus={latestVerificationRequest?.status ?? null}
        latestRequestPaymentStatus={latestVerificationRequest?.paymentStatus ?? null}
      />
      <div>
        <h1 className="text-2xl font-light tracking-tight text-[#1c3a13]">
          Welcome back, {session.user.name?.split(" ")[0]}
        </h1>
        <p className="text-[#1c3a13]/50 text-sm mt-1">
          {logisticsProfile?.companyName
            ? `${logisticsProfile.companyName} — `
            : ""}
          {logisticsProfile?.vehicleType?.replace(/_/g, " ") ?? "Driver"} Portal
        </p>
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

      {/* Pending Transport Requests */}
      <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9]">
        <div className="px-6 py-4 border-b border-[#eeeee9]">
          <h2 className="font-medium text-[#1c3a13]">Available Transport Requests</h2>
          <p className="text-xs text-[#1c3a13]/50 mt-0.5">Accept requests to earn money on deliveries</p>
        </div>
        {pendingRequests.length === 0 ? (
          <div className="py-14 text-center">
            <div className="text-5xl mb-4" role="img">🚛</div>
            <h3 className="text-lg font-light tracking-tight text-[#1c3a13] mb-2">No pending requests</h3>
            <p className="text-[#1c3a13]/50 text-sm">Check back later for new transport requests.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#eeeee9]">
            {pendingRequests.map((request) => (
              <div key={request.id} className="px-6 py-4 hover:bg-[#eeeee9] transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {request.order && (
                        <span className="text-sm font-semibold text-[#1c3a13]">
                          {request.order.listing.cropType}
                        </span>
                      )}
                      <Badge variant={TRANSPORT_STATUS_VARIANT[request.status] ?? "secondary"}>
                        {request.status}
                      </Badge>
                      {request.estimatedCost && (
                        <span className="text-sm font-medium text-[#1c3a13]">
                          ~{formatCurrency(request.estimatedCost)}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-sm text-[#1c3a13]/70">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-[#1c3a13]/40 flex-shrink-0" />
                        <span className="truncate">From: {request.pickupLocation}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-[#1c3a13] flex-shrink-0" />
                        <span className="truncate">To: {request.deliveryLocation}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-[#1c3a13]/40 flex-shrink-0" />
                        <span>{formatDate(request.scheduledDate)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#1c3a13]/50">Requester: {request.requester.name}</span>
                      </div>
                    </div>
                  </div>

                  <form action={acceptTransportRequest.bind(null, request.id)}>
                    <Button
                      type="submit"
                      size="sm"
                      variant="outline"
                      disabled={!isVerified}
                      title={!isVerified ? "Verify your account to accept jobs" : undefined}
                      className="flex-shrink-0 rounded-full border-[#1c3a13] text-[#1c3a13] hover:bg-[#eeeee9]"
                    >
                      Accept
                    </Button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
