"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, ChevronRight, TrendingDown, Sparkles } from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { lossColorClass } from "@/lib/post-harvest-loss";

interface Customer {
  farmer: { id: string; name: string; phone: string; location: string; farmName: string | null };
  inStockValue: number;
  activeListingCount: number;
  lossPercentageThisMonth: number | null;
}

export default function StorageCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [tips, setTips] = useState<Record<string, string>>({});
  const [tipLoading, setTipLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/api/storage/customers")
      .then((r) => r.json())
      .then((d) => setCustomers(d.customers ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function loadTip(farmerId: string) {
    setTipLoading((prev) => ({ ...prev, [farmerId]: true }));
    try {
      const res = await fetch(`/api/storage/customers/${farmerId}/ai-tip`);
      if (res.ok) {
        const data = await res.json();
        setTips((prev) => ({ ...prev, [farmerId]: data.content }));
      }
    } finally {
      setTipLoading((prev) => ({ ...prev, [farmerId]: false }));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-light tracking-tight text-[#1c3a13]">My Customers</h1>
        <p className="text-[#1c3a13]/50 text-sm mt-1">
          Farmers with a confirmed storage relationship at your facility — help them reduce post-harvest loss.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-[#1c3a13]/40" /></div>
      ) : customers.length === 0 ? (
        <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] py-20 text-center">
          <div className="text-5xl mb-3">🧑‍🌾</div>
          <p className="text-[#1c3a13]/50">No customers yet — confirmed bookings will appear here.</p>
        </div>
      ) : (
        <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#eeeee9] text-left text-xs font-medium uppercase tracking-wide text-[#1c3a13]/50">
                <th className="px-5 py-3">Farmer</th>
                <th className="px-5 py-3">Location</th>
                <th className="px-5 py-3">In-Stock Value</th>
                <th className="px-5 py-3">PHL % (this month)</th>
                <th className="px-5 py-3">AI Tip</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {customers.map(({ farmer, inStockValue, activeListingCount, lossPercentageThisMonth }) => (
                <tr key={farmer.id} className="border-b border-[#eeeee9] last:border-0 hover:bg-[#eeeee9] transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-[#1c3a13]">{farmer.name}</p>
                    <p className="text-xs text-[#1c3a13]/50">{farmer.farmName ?? farmer.phone}</p>
                  </td>
                  <td className="px-5 py-3 text-[#1c3a13]/70">{farmer.location || "—"}</td>
                  <td className="px-5 py-3">
                    <p className="font-medium text-[#1c3a13]">{formatCurrency(inStockValue)}</p>
                    <p className="text-xs text-[#1c3a13]/40">{activeListingCount} active listing{activeListingCount !== 1 ? "s" : ""}</p>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${lossColorClass(lossPercentageThisMonth)}`}>
                      <TrendingDown className="h-3 w-3" />
                      {lossPercentageThisMonth === null ? "—" : formatPercent(lossPercentageThisMonth)}
                    </span>
                  </td>
                  <td className="px-5 py-3 max-w-xs">
                    {tips[farmer.id] ? (
                      <p className="text-xs text-[#1c3a13]/70 line-clamp-3" title={tips[farmer.id]}>{tips[farmer.id]}</p>
                    ) : (
                      <button
                        onClick={() => loadTip(farmer.id)}
                        disabled={tipLoading[farmer.id]}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#1c3a13] hover:underline disabled:opacity-50"
                      >
                        {tipLoading[farmer.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                        Get AI Tip
                      </button>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link href={`/storage/customers/${farmer.id}`} className="inline-flex items-center gap-1 text-xs font-medium text-[#1c3a13] hover:underline">
                      More <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
