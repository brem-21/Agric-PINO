import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ReviewForm } from "@/components/shared/review-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Leaf } from "lucide-react";
import Link from "next/link";
import type { ReviewOrderType } from "@prisma/client";

function NotYetDeliveredCard({ backHref }: { backHref: string }) {
  return (
    <div className="min-h-screen bg-[#fcfcf7] flex items-center justify-center p-4">
      <Card className="max-w-sm w-full text-center bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl">
        <CardContent className="p-8">
          <p className="text-2xl mb-3">⏳</p>
          <p className="font-medium text-[#1c3a13]">Order not yet delivered</p>
          <p className="text-sm text-[#1c3a13]/50 mt-1">
            Reviews can be submitted after the order is delivered.
          </p>
          <Link href={backHref} className="text-[#1c3a13] text-sm underline mt-4 inline-block">
            Back to orders
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

function AllDoneCard() {
  return (
    <div className="min-h-screen bg-[#fcfcf7] flex items-center justify-center p-4">
      <Card className="max-w-sm w-full text-center bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl">
        <CardContent className="p-8">
          <p className="text-4xl mb-3">⭐</p>
          <p className="font-medium text-[#1c3a13]">Already reviewed</p>
          <p className="text-sm text-[#1c3a13]/50 mt-1">
            You&apos;ve already submitted your review(s) for this order.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default async function ReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { orderId } = await params;
  const { type } = await searchParams;
  const orderType: ReviewOrderType = type === "vendor" ? "VENDOR_ORDER" : "ORDER";

  const session = await auth();
  if (!session) redirect(`/auth/login?redirect=/review/${orderId}${type ? `?type=${type}` : ""}`);

  const status =
    orderType === "VENDOR_ORDER"
      ? (await prisma.vendorOrder.findUnique({ where: { id: orderId }, select: { status: true } }))?.status
      : (await prisma.order.findUnique({ where: { id: orderId }, select: { status: true } }))?.status;

  if (!status) notFound();

  const backHref = orderType === "VENDOR_ORDER" ? "/buyer/purchases" : "/buyer/orders";

  if (status !== "DELIVERED") {
    return <NotYetDeliveredCard backHref={backHref} />;
  }

  const pending = await prisma.reviewRequest.findMany({
    where: { orderId, userId: session.user.id, orderType, completed: false },
    orderBy: { createdAt: "asc" },
  });

  if (pending.length === 0) {
    return <AllDoneCard />;
  }

  const targets = await prisma.user.findMany({
    where: { id: { in: pending.map((p) => p.targetId) } },
    select: {
      id: true,
      name: true,
      farmerProfile: { select: { farmName: true } },
      vendorProfile: { select: { shopName: true } },
    },
  });

  const items = pending.map((p) => {
    const target = targets.find((t) => t.id === p.targetId);
    const targetName =
      p.targetRole === "FARMER"
        ? target?.farmerProfile?.farmName ?? target?.name ?? "Farmer"
        : p.targetRole === "VENDOR"
        ? target?.vendorProfile?.shopName ?? target?.name ?? "Vendor"
        : target?.name ?? "User";

    return { targetId: p.targetId, targetRole: p.targetRole, targetName };
  });

  return (
    <div className="min-h-screen bg-[#fcfcf7]">
      <div className="bg-[#1c3a13] text-[#fcfcf7] py-6 px-4">
        <div className="max-w-lg mx-auto flex items-center gap-2">
          <Leaf className="h-5 w-5" />
          <span className="font-medium">Lorgric</span>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
        {items.map((item) => (
          <Card key={item.targetId} className="bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl">
            <CardHeader className="text-center pb-2">
              <div className="text-4xl mb-2">⭐</div>
              <CardTitle className="font-light tracking-tight text-[#1c3a13]">Rate Your Experience</CardTitle>
              <CardDescription className="text-[#1c3a13]/50">
                Order #{orderId.slice(-8).toUpperCase()} · Your feedback builds trust on the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ReviewForm
                orderId={orderId}
                orderType={orderType}
                targetId={item.targetId}
                targetName={item.targetName}
                targetRole={item.targetRole}
              />
            </CardContent>
          </Card>
        ))}

        <p className="text-center text-xs text-[#1c3a13]/40">
          <Link href="/" className="hover:underline">Lorgric</Link> · Northern Savannah Zone, Ghana
        </p>
      </div>
    </div>
  );
}
