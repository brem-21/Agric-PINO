import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BulkOrderForm } from "./bulk-order-form";

export default async function NewBulkOrderPage() {
  const session = await auth();
  if (!session || session.user.role !== "BUYER") redirect("/auth/login");

  const buyerProfile = await prisma.buyerProfile.findUnique({
    where: { userId: session.user.id },
    select: { businessType: true },
  });
  const eligible = buyerProfile && ["WHOLESALER", "PROCESSOR"].includes(buyerProfile.businessType);

  if (!eligible) {
    return (
      <div className="max-w-lg mx-auto py-12 text-center space-y-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 mx-auto">
          <ShieldAlert className="h-7 w-7 text-amber-600" />
        </div>
        <h1 className="text-xl font-light tracking-tight text-[#1c3a13]">Bulk ordering isn&apos;t available on this account</h1>
        <p className="text-sm text-[#1c3a13]/50">
          Aggregating produce across multiple farmers into one order is built for wholesale and processing buyers.
          Update your business type to Wholesaler or Processor in your profile to unlock it — the regular marketplace still works for any account type.
        </p>
        <div className="flex items-center justify-center gap-2">
          <Button asChild variant="outline" className="rounded-full border-[#eeeee9] text-[#1c3a13]">
            <Link href="/marketplace">Browse Marketplace</Link>
          </Button>
          <Button asChild className="rounded-full bg-[#1c3a13] text-[#fcfcf7] hover:bg-[#2a5219]">
            <Link href="/profile">Update Profile</Link>
          </Button>
        </div>
      </div>
    );
  }

  return <BulkOrderForm />;
}
