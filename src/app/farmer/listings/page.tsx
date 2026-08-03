import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatCurrency, formatDate, getSpoilageUrgency } from "@/lib/utils";
import { PlusCircle, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

const CATEGORY_EMOJI: Record<string, string> = {
  VEGETABLES: "🥦",
  GRAINS: "🌾",
  TUBERS: "🍠",
  FRUITS: "🍎",
  LEGUMES: "🫘",
  LIVESTOCK: "🐄",
};

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-[#d3fa99] text-[#1c3a13]",
  DRAFT: "bg-[#eeeee9] text-[#1c3a13]",
  SOLD: "bg-[#eeeee9] text-[#1c3a13]",
  EXPIRED: "bg-red-100 text-red-700",
};

// Approval moderation state takes priority over the lifecycle status — a
// listing defaults to ACTIVE the moment it's created, well before an admin
// has approved it, so showing that raw status would tell a farmer their
// produce is live when it's actually still invisible on the marketplace.
const APPROVAL_LABELS: Record<string, string> = {
  PENDING: "Pending Approval",
  REJECTED: "Rejected",
};
const APPROVAL_STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  REJECTED: "bg-red-100 text-red-700",
};

export default async function FarmerListingsPage() {
  const session = await auth();
  if (!session || session.user.role !== "FARMER") redirect("/auth/login");

  const listings = await prisma.produceListing.findMany({
    where: { farmerId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light tracking-tight text-[#1c3a13]">My Listings</h1>
          <p className="text-[#1c3a13]/50 text-sm mt-1">
            {listings.length} listing{listings.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <Button asChild className="rounded-full bg-[#1c3a13] text-[#fcfcf7] hover:bg-[#2a5219]">
          <Link href="/farmer/listings/new">
            <PlusCircle className="h-4 w-4 mr-2" />
            Add New Listing
          </Link>
        </Button>
      </div>

      {/* Listings Table */}
      <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] overflow-hidden">
        {listings.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-5xl mb-4" role="img" aria-label="plant">🌱</div>
            <h3 className="text-lg font-medium text-[#1c3a13] mb-2">No listings yet</h3>
            <p className="text-[#1c3a13]/50 text-sm mb-4">Start selling your produce by creating your first listing.</p>
            <Button asChild className="rounded-full bg-[#1c3a13] text-[#fcfcf7] hover:bg-[#2a5219]">
              <Link href="/farmer/listings/new">Create Listing</Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#eeeee9] bg-[#eeeee9]">
                  <th className="text-left px-6 py-3 font-medium text-[#1c3a13]">Produce</th>
                  <th className="text-left px-6 py-3 font-medium text-[#1c3a13]">Category</th>
                  <th className="text-right px-6 py-3 font-medium text-[#1c3a13]">Quantity</th>
                  <th className="text-right px-6 py-3 font-medium text-[#1c3a13]">Price/Unit</th>
                  <th className="text-left px-6 py-3 font-medium text-[#1c3a13]">Status</th>
                  <th className="text-left px-6 py-3 font-medium text-[#1c3a13]">Spoilage Risk</th>
                  <th className="text-left px-6 py-3 font-medium text-[#1c3a13]">Created</th>
                  <th className="text-right px-6 py-3 font-medium text-[#1c3a13]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eeeee9]">
                {listings.map((listing) => (
                  <tr key={listing.id} className="hover:bg-[#eeeee9] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl flex-shrink-0" role="img">
                          {CATEGORY_EMOJI[listing.category] ?? "🌿"}
                        </span>
                        <div>
                          <p className="font-medium text-[#1c3a13]">{listing.cropType}</p>
                          <p className="text-xs text-[#1c3a13]/40">{listing.location}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[#1c3a13]/70">
                      {listing.category.charAt(0) + listing.category.slice(1).toLowerCase()}
                    </td>
                    <td className="px-6 py-4 text-right text-[#1c3a13]/70">
                      {listing.quantity} {listing.unit}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-[#1c3a13]">
                      {formatCurrency(listing.pricePerUnit)}
                    </td>
                    <td className="px-6 py-4">
                      {listing.approvalStatus !== "APPROVED" ? (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${APPROVAL_STYLES[listing.approvalStatus] ?? "bg-[#eeeee9] text-[#1c3a13]"}`}>
                          {APPROVAL_LABELS[listing.approvalStatus] ?? listing.approvalStatus}
                        </span>
                      ) : (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[listing.status] ?? "bg-[#eeeee9] text-[#1c3a13]"}`}>
                          {listing.status}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {listing.status === "ACTIVE" && getSpoilageUrgency(listing.expiryDate) ? (
                        (() => {
                          const urgency = getSpoilageUrgency(listing.expiryDate)!;
                          return (
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                urgency.level === "critical"
                                  ? "bg-red-100 text-red-700"
                                  : urgency.level === "urgent"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-yellow-50 text-yellow-700"
                              }`}
                            >
                              <AlertTriangle className="h-3 w-3" />
                              {urgency.label}
                            </span>
                          );
                        })()
                      ) : (
                        <span className="text-[#1c3a13]/30 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-[#1c3a13]/50">{formatDate(listing.createdAt)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm" asChild className="rounded-full border-[#eeeee9] text-[#1c3a13] hover:bg-[#eeeee9] hover:border-[#1c3a13]">
                          <Link href={`/farmer/listings/${listing.id}/edit`}>
                            <Pencil className="h-3.5 w-3.5 mr-1" />
                            Edit
                          </Link>
                        </Button>
                        <form
                          action={async () => {
                            "use server";
                            const { prisma: db } = await import("@/lib/prisma");
                            await db.produceListing.delete({ where: { id: listing.id } });
                            const { revalidatePath } = await import("next/cache");
                            revalidatePath("/farmer/listings");
                          }}
                        >
                          <Button variant="destructive" size="sm" type="submit" className="rounded-full">
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Delete
                          </Button>
                        </form>
                      </div>
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
