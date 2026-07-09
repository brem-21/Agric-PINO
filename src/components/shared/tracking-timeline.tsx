"use client";

import { Check, Circle, Clock, Truck, Package, MapPin, ShoppingBag, Star } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "READY_FOR_PICKUP"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "CANCELLED";

interface TrackingStep {
  status: OrderStatus;
  label: string;
  description: string;
  icon: React.ElementType;
}

const STEPS: TrackingStep[] = [
  { status: "PENDING", label: "Order Placed", description: "Waiting for farmer to confirm", icon: ShoppingBag },
  { status: "CONFIRMED", label: "Confirmed", description: "Farmer accepted the order", icon: Check },
  { status: "PROCESSING", label: "Processing", description: "Produce being prepared", icon: Package },
  { status: "READY_FOR_PICKUP", label: "Ready for Pickup", description: "Awaiting logistics", icon: MapPin },
  { status: "IN_TRANSIT", label: "In Transit", description: "On the way to you", icon: Truck },
  { status: "DELIVERED", label: "Delivered", description: "Order complete!", icon: Star },
];

const STATUS_ORDER: OrderStatus[] = [
  "PENDING", "CONFIRMED", "PROCESSING", "READY_FOR_PICKUP", "IN_TRANSIT", "DELIVERED",
];

interface TrackingTimelineProps {
  currentStatus: OrderStatus;
  updatedAt: string;
  transportProvider?: {
    name: string;
    phone: string;
    vehicleType: string;
  } | null;
}

export function TrackingTimeline({
  currentStatus,
  updatedAt,
  transportProvider,
}: TrackingTimelineProps) {
  if (currentStatus === "CANCELLED") {
    return (
      <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl border border-red-200">
        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
          <Circle className="h-5 w-5 text-red-600" />
        </div>
        <div>
          <p className="font-semibold text-red-800">Order Cancelled</p>
          <p className="text-sm text-red-600">This order has been cancelled.</p>
        </div>
      </div>
    );
  }

  const currentIndex = STATUS_ORDER.indexOf(currentStatus);

  return (
    <div className="space-y-0">
      {STEPS.map((step, i) => {
        const stepIndex = STATUS_ORDER.indexOf(step.status);
        const isCompleted = stepIndex < currentIndex;
        const isCurrent = step.status === currentStatus;
        const isPending = stepIndex > currentIndex;
        const isLast = i === STEPS.length - 1;

        const Icon = step.icon;

        return (
          <div key={step.status} className="flex gap-4">
            {/* Icon + line */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 transition-all",
                  isCompleted && "bg-[#1c3a13] text-white",
                  isCurrent && "bg-[#1c3a13] text-white ring-4 ring-green-100",
                  isPending && "bg-gray-100 text-[#1c3a13]/40 border-2 border-gray-200"
                )}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5" />
                ) : isCurrent ? (
                  <Icon className="h-5 w-5" />
                ) : (
                  <Clock className="h-4 w-4" />
                )}
              </div>
              {!isLast && (
                <div
                  className={cn(
                    "w-0.5 flex-1 mt-1 mb-1 min-h-[2rem]",
                    isCompleted ? "bg-[#1c3a13]" : "bg-[#eeeee9]"
                  )}
                />
              )}
            </div>

            {/* Content */}
            <div className={cn("pb-6 pt-2 flex-1", isLast && "pb-0")}>
              <p
                className={cn(
                  "font-medium text-sm",
                  (isCompleted || isCurrent) ? "text-[#1c3a13]" : "text-[#1c3a13]/40"
                )}
              >
                {step.label}
              </p>
              <p
                className={cn(
                  "text-xs mt-0.5",
                  isCurrent ? "text-[#1c3a13] font-medium" : "text-[#1c3a13]/40"
                )}
              >
                {isCurrent ? step.description : isPending ? "Pending" : step.description}
              </p>
              {isCurrent && (
                <p className="text-xs text-[#1c3a13]/40 mt-1">Last updated: {formatDate(updatedAt)}</p>
              )}
              {step.status === "IN_TRANSIT" && isCurrent && transportProvider && (
                <div className="mt-2 bg-[#eeeee9] rounded-lg p-2.5 text-xs">
                  <p className="font-medium text-[#1c3a13]">🚚 {transportProvider.name}</p>
                  <p className="text-[#1c3a13]">{transportProvider.vehicleType.replace("_", " ")}</p>
                  <a
                    href={`tel:${transportProvider.phone}`}
                    className="text-[#1c3a13] underline"
                  >
                    📞 {transportProvider.phone}
                  </a>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
