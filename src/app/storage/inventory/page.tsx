import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Package, MapPin } from "lucide-react";

const CATEGORY_EMOJI: Record<string, string> = {
  VEGETABLES: "🥦", GRAINS: "🌾", TUBERS: "🍠", FRUITS: "🍎", LEGUMES: "🫘", LIVESTOCK: "🐄",
};

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-[#d3fa99] text-[#1c3a13]",
  SOLD: "bg-[#eeeee9] text-[#1c3a13]",
  EXPIRED: "bg-red-100 text-red-700",
  DRAFT: "bg-[#eeeee9] text-[#1c3a13]",
};

export default async function StorageInventoryPage() {
  const session = await auth();
  if (!session || session.user.role !== "STORAGE_FACILITY") redirect("/auth/login");

  const facility = await prisma.storageFacilityProfile.findUnique({ where: { userId: session.user.id } });

  const listings = facility
    ? await prisma.produceListing.findMany({
        where: { storageFacilityId: facility.id },
        include: { farmer: { select: { name: true, phone: true } } },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const activeCount = listings.filter((l) => l.status === "ACTIVE").length;
  const activeTonnage = listings
    .filter((l) => l.status === "ACTIVE" && l.unit.toLowerCase().includes("kg"))
    .reduce((sum, l) => sum + l.quantity, 0) / 1000;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-light tracking-tight text-[#1c3a13]">Inventory</h1>
        <p className="text-[#1c3a13]/50 text-sm mt-1">
          Produce currently held at your facility
          {facility?.capacityTonnes ? ` — ~${activeTonnage.toFixed(1)}t of ${facility.capacityTonnes}t capacity (advisory)` : ""}
        </p>
      </div>

      {listings.length === 0 ? (
        <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] py-20 text-center">
          <div className="text-5xl mb-3">📦</div>
          <p className="text-[#1c3a13]/50">Nothing in storage yet — confirmed bookings marked &quot;Dropped Off&quot; will appear here.</p>
        </div>
      ) : (
        <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] overflow-hidden">
          <div className="px-6 py-3 border-b border-[#eeeee9] text-sm text-[#1c3a13]/50">
            {activeCount} active listing{activeCount !== 1 ? "s" : ""} of {listings.length} total
          </div>
          <div className="divide-y divide-[#eeeee9]">
            {listings.map((l) => (
              <div key={l.id} className="px-6 py-4 flex items-center gap-4">
                <span className="text-2xl flex-shrink-0">{CATEGORY_EMOJI[l.category] ?? "🌿"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-[#1c3a13]">{l.cropType}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[l.status] ?? "bg-[#eeeee9] text-[#1c3a13]"}`}>
                      {l.status}
                    </span>
                    {l.approvalStatus !== "APPROVED" && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">
                        {l.approvalStatus === "PENDING" ? "Pending Approval" : "Rejected"}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#1c3a13]/50 mt-0.5">
                    {l.farmer.name} · {l.farmer.phone}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-[#1c3a13] flex items-center gap-1 justify-end">
                    <Package className="h-3.5 w-3.5 text-[#1c3a13]/40" />
                    {l.quantity} {l.unit}
                  </p>
                  <p className="text-xs text-[#1c3a13]/50">{formatCurrency(l.pricePerUnit)}/{l.unit}</p>
                </div>
                <div className="text-right flex-shrink-0 hidden sm:block">
                  <p className="text-xs text-[#1c3a13]/40 flex items-center gap-1 justify-end">
                    <MapPin className="h-3 w-3" />
                    Since {formatDate(l.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
