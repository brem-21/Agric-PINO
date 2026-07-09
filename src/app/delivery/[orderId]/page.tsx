import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Leaf, Phone, Package, Truck, User, CheckCircle, Circle, MapPin, FileText } from "lucide-react";
import Link from "next/link";
import { PrintButton } from "./print-button";
import { WhatsAppButton } from "./whatsapp-button";
import { BackButton } from "@/components/shared/back-button";

type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "READY_FOR_PICKUP"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "CANCELLED";

const STATUS_ORDER: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "READY_FOR_PICKUP",
  "IN_TRANSIT",
  "DELIVERED",
];

function isStatusComplete(current: OrderStatus, step: OrderStatus): boolean {
  const currentIdx = STATUS_ORDER.indexOf(current === "PROCESSING" ? "CONFIRMED" : current);
  const stepIdx = STATUS_ORDER.indexOf(step);
  if (currentIdx === -1 || stepIdx === -1) return false;
  return currentIdx >= stepIdx;
}

function formatVehicleType(vt: string): string {
  return vt
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

const STEP_DEFS: { label: string; status: OrderStatus; icon: React.ReactNode }[] = [
  { label: "Order Placed", status: "PENDING", icon: <FileText className="h-4 w-4" /> },
  { label: "Confirmed", status: "CONFIRMED", icon: <CheckCircle className="h-4 w-4" /> },
  { label: "Ready for Pickup", status: "READY_FOR_PICKUP", icon: <Package className="h-4 w-4" /> },
  { label: "In Transit", status: "IN_TRANSIT", icon: <Truck className="h-4 w-4" /> },
  { label: "Delivered", status: "DELIVERED", icon: <CheckCircle className="h-4 w-4" /> },
];

export default async function DeliverySlipPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      listing: {
        select: {
          cropType: true,
          unit: true,
          images: true,
          location: true,
          category: true,
        },
      },
      buyer: {
        select: {
          name: true,
          phone: true,
          isVerified: true,
          verifiedAt: true,
          buyerProfile: { select: { businessName: true } },
        },
      },
      farmer: {
        select: {
          name: true,
          phone: true,
          isVerified: true,
          verifiedAt: true,
          farmerProfile: { select: { farmName: true, location: true } },
        },
      },
      payment: { select: { status: true, method: true } },
      transportRequest: {
        select: {
          pickupLocation: true,
          deliveryLocation: true,
          scheduledDate: true,
          estimatedDeliveryDate: true,
          estimatedCost: true,
          status: true,
          provider: {
            include: {
              user: { select: { name: true, phone: true } },
            },
          },
        },
      },
    },
  });

  if (!order) notFound();

  const currentStatus = order.status as OrderStatus;
  const displayNumber =
    order.deliveryNumber ?? `LRG-${orderId.slice(-8).toUpperCase()}`;
  const shortId = orderId.slice(-8).toUpperCase();

  const rider = order.transportRequest?.provider
    ? {
        name: order.transportRequest.provider.user.name,
        phone: order.transportRequest.provider.user.phone,
        vehicleType: order.transportRequest.provider.vehicleType,
      }
    : null;

  const paymentStatusColor: Record<string, string> = {
    PAID: "bg-[#d3fa99] text-[#1c3a13]",
    UNPAID: "bg-[#eeeee9] text-[#1c3a13]",
    REFUNDED: "bg-[#eeeee9] text-[#1c3a13]/70",
  };

  return (
    <div className="min-h-screen bg-[#fcfcf7] print:bg-white">
      {/* Top bar */}
      <div className="bg-[#1c3a13] text-[#fcfcf7] py-6 px-4 print:py-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <Link href="/" className="flex items-center gap-2 mb-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#d3fa99]">
                  <Leaf className="h-4 w-4 text-[#1c3a13]" />
                </div>
                <span className="font-medium text-lg tracking-tight text-[#fcfcf7]">
                  Lorgric<span className="text-[#d3fa99]">●</span>
                </span>
              </Link>
              <h1 className="text-sm font-medium text-[#fcfcf7]/60 uppercase tracking-wider">
                Delivery Slip
              </h1>
            </div>
            <div className="text-right">
              <p className="font-mono text-2xl font-bold tracking-widest text-[#fcfcf7]">
                {displayNumber}
              </p>
              <p className="text-[#fcfcf7]/50 text-xs mt-1">
                Order #{shortId} &middot; Placed {formatDate(order.createdAt)}
              </p>
              <div className="mt-3 print:hidden">
                <BackButton className="border-white/20 text-[#fcfcf7] hover:bg-white/10 hover:border-white/40" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Progress stepper */}
        <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] p-4">
          <h2 className="text-xs font-medium text-[#1c3a13]/50 uppercase tracking-wider mb-4">
            Delivery Progress
          </h2>
          <div className="flex items-start justify-between gap-1">
            {STEP_DEFS.map((step, idx) => {
              const done = isStatusComplete(currentStatus, step.status);
              const isLast = idx === STEP_DEFS.length - 1;
              return (
                <div key={step.status} className="flex flex-1 flex-col items-center gap-1 relative">
                  {idx > 0 && (
                    <div
                      className={`absolute left-0 top-4 h-0.5 w-1/2 -translate-x-full ${
                        done ? "bg-[#1c3a13]" : "bg-[#eeeee9]"
                      }`}
                    />
                  )}
                  {!isLast && (
                    <div
                      className={`absolute right-0 top-4 h-0.5 w-1/2 translate-x-full ${
                        isStatusComplete(
                          currentStatus,
                          STEP_DEFS[idx + 1]?.status ?? "PENDING"
                        )
                          ? "bg-[#1c3a13]"
                          : "bg-[#eeeee9]"
                      }`}
                    />
                  )}
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center z-10 ${
                      done
                        ? "bg-[#1c3a13] text-[#fcfcf7]"
                        : "bg-[#eeeee9] text-[#1c3a13]/40"
                    }`}
                  >
                    {done ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </div>
                  <p
                    className={`text-xs text-center leading-tight mt-1 ${
                      done ? "text-[#1c3a13] font-medium" : "text-[#1c3a13]/40"
                    }`}
                  >
                    {step.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Produce */}
          <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] p-4">
            <h3 className="text-xs font-medium text-[#1c3a13]/50 uppercase tracking-wider mb-3">
              Produce
            </h3>
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-[#1c3a13]/50">Crop</span>
                <span className="font-medium text-[#1c3a13]">
                  {order.listing.cropType}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#1c3a13]/50">Quantity</span>
                <span className="font-medium text-[#1c3a13]">
                  {order.quantity} {order.listing.unit}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#1c3a13]/50">Total Amount</span>
                <span className="font-bold text-[#1c3a13]">
                  {formatCurrency(order.totalAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Transport */}
          <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] p-4">
            <h3 className="text-xs font-medium text-[#1c3a13]/50 uppercase tracking-wider mb-3">
              Transport
            </h3>
            {order.transportRequest ? (
              <div className="space-y-1.5">
                {rider && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#1c3a13]/50">Vehicle</span>
                    <span className="font-medium text-[#1c3a13]">
                      {formatVehicleType(rider.vehicleType)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-[#1c3a13]/50">Pickup</span>
                  <span className="font-medium text-[#1c3a13] text-right max-w-[60%]">
                    {order.transportRequest.pickupLocation}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#1c3a13]/50">Delivery</span>
                  <span className="font-medium text-[#1c3a13] text-right max-w-[60%]">
                    {order.transportRequest.deliveryLocation}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#1c3a13]/50">Scheduled</span>
                  <span className="font-medium text-[#1c3a13]">
                    {formatDate(order.transportRequest.scheduledDate)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#1c3a13]/50">Est. Delivery</span>
                  <span className="font-medium text-[#1c3a13]">
                    {order.transportRequest.estimatedDeliveryDate
                      ? formatDate(order.transportRequest.estimatedDeliveryDate)
                      : "Not set"}
                  </span>
                </div>
                {order.transportRequest.estimatedCost && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#1c3a13]/50">Est. Cost</span>
                    <span className="font-medium text-[#1c3a13]">
                      {formatCurrency(order.transportRequest.estimatedCost)}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-[#1c3a13]/50">No transport assigned yet.</p>
            )}
          </div>

          {/* Payment */}
          <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] p-4">
            <h3 className="text-xs font-medium text-[#1c3a13]/50 uppercase tracking-wider mb-3">
              Payment
            </h3>
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-[#1c3a13]/50">Method</span>
                <span className="font-medium text-[#1c3a13]">
                  {order.payment?.method
                    ? order.payment.method.replace(/_/g, " ")
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between text-sm items-center">
                <span className="text-[#1c3a13]/50">Status</span>
                <span
                  className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
                    paymentStatusColor[order.paymentStatus] ??
                    "bg-[#eeeee9] text-[#1c3a13]"
                  }`}
                >
                  {order.paymentStatus}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Three party cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Farmer */}
          <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#d3fa99]">
                <Leaf className="h-3.5 w-3.5 text-[#1c3a13]" />
              </div>
              <span className="text-xs font-medium text-[#1c3a13]/50 uppercase tracking-wider">
                Farmer
              </span>
            </div>
            <p className="font-medium text-sm text-[#1c3a13]">
              {order.farmer.farmerProfile?.farmName ?? order.farmer.name}
            </p>
            {order.farmer.farmerProfile?.location && (
              <p className="text-xs text-[#1c3a13]/50 flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3" />
                {order.farmer.farmerProfile.location}
              </p>
            )}
            {order.farmer.phone && (
              <a
                href={`tel:${order.farmer.phone}`}
                className="flex items-center gap-1 text-xs text-[#1c3a13] mt-1.5 hover:underline"
              >
                <Phone className="h-3 w-3" />
                {order.farmer.phone}
              </a>
            )}
          </div>

          {/* Buyer */}
          <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#eeeee9]">
                <User className="h-3.5 w-3.5 text-[#1c3a13]" />
              </div>
              <span className="text-xs font-medium text-[#1c3a13]/50 uppercase tracking-wider">
                Buyer
              </span>
            </div>
            <p className="font-medium text-sm text-[#1c3a13]">
              {order.buyer.buyerProfile?.businessName ?? order.buyer.name}
            </p>
            {order.buyer.phone && (
              <a
                href={`tel:${order.buyer.phone}`}
                className="flex items-center gap-1 text-xs text-[#1c3a13] mt-1.5 hover:underline"
              >
                <Phone className="h-3 w-3" />
                {order.buyer.phone}
              </a>
            )}
          </div>

          {/* Rider */}
          <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#eeeee9]">
                <Truck className="h-3.5 w-3.5 text-[#1c3a13]" />
              </div>
              <span className="text-xs font-medium text-[#1c3a13]/50 uppercase tracking-wider">
                Rider
              </span>
            </div>
            {rider ? (
              <>
                <p className="font-medium text-sm text-[#1c3a13]">{rider.name}</p>
                <p className="text-xs text-[#1c3a13]/50 mt-0.5">
                  {formatVehicleType(rider.vehicleType)}
                </p>
                {rider.phone && (
                  <a
                    href={`tel:${rider.phone}`}
                    className="flex items-center gap-1 text-xs text-[#1c3a13] mt-1.5 hover:underline"
                  >
                    <Phone className="h-3 w-3" />
                    {rider.phone}
                  </a>
                )}
              </>
            ) : (
              <p className="text-sm text-[#1c3a13]/40 italic">
                No rider assigned yet
              </p>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex flex-wrap gap-3 pt-2 print:hidden">
          <WhatsAppButton orderId={orderId} />
          <PrintButton />
          <Link
            href={`/tracking/${orderId}`}
            className="inline-flex items-center gap-2 rounded-full border border-[#1c3a13] px-4 py-2 text-sm font-medium text-[#1c3a13] hover:bg-[#eeeee9] transition-colors"
          >
            View Tracking Page
          </Link>
        </div>

        <p className="text-center text-xs text-[#1c3a13]/40 pb-4">
          Lorgric &middot; Northern Savannah Zone, Ghana
        </p>
      </div>
    </div>
  );
}
