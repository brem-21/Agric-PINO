import Link from "next/link";
import type { Metadata } from "next";
import {
  Leaf,
  Users,
  Package,
  Truck,
  MapPin,
  ShoppingCart,
  Wrench,
  HandCoins,
  ShieldCheck,
  Handshake,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollReveal } from "@/components/shared/scroll-reveal";
import { getPlatformStats } from "@/lib/platform-stats";

export const metadata: Metadata = {
  title: "About — Lorgric",
  description:
    "Lorgric connects smallholder farmers in Ghana's Northern Savannah Zone directly with buyers, delivery riders, and equipment vendors — cutting out middlemen and post-harvest waste.",
};

const ROLES = [
  {
    icon: Leaf,
    title: "Farmers",
    description:
      "List your harvest with photos, quantity, and price. Reach buyers directly instead of relying on middlemen, and get paid fairly for what you grow.",
  },
  {
    icon: ShoppingCart,
    title: "Buyers",
    description:
      "Browse fresh produce by crop, price, and location. Order directly from the farm and track your delivery from pickup to doorstep.",
  },
  {
    icon: Truck,
    title: "Delivery Riders",
    description:
      "Pick up available transport jobs in your area, get paid per delivery, and build a rating that brings you more work over time.",
  },
  {
    icon: Wrench,
    title: "Equipment Vendors",
    description:
      "Sell seeds, fertilizer, and farm equipment straight to the farmers who need them, with your own storefront and delivery fleet.",
  },
];

const VALUES = [
  {
    icon: HandCoins,
    title: "Fair pricing",
    description: "No hidden middleman markups — the price a buyer pays is the price agreed with the farmer.",
  },
  {
    icon: Handshake,
    title: "Direct connections",
    description: "Farmers, buyers, riders, and vendors deal with each other directly, not through a broker.",
  },
  {
    icon: ShieldCheck,
    title: "Trust & transparency",
    description: "Every order, delivery, and transaction is tracked, and every party can rate the other.",
  },
  {
    icon: MapPin,
    title: "Community-first",
    description: "Built around the Northern Savannah Zone's farming communities, not adapted from somewhere else.",
  },
];

export default async function AboutPage() {
  const stats = await getPlatformStats();
  const STATS = [
    { label: "Active Farmers", value: stats.activeFarmers.toLocaleString(), icon: Users },
    { label: "Produce Listings", value: stats.produceListings.toLocaleString(), icon: Package },
    { label: "Tons Delivered", value: stats.tonsDelivered.toLocaleString(), icon: Truck },
    { label: "Districts Covered", value: stats.districtsCovered.toLocaleString(), icon: MapPin },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#fcfcf7]">
      <main>
        {/* Hero */}
        <section className="bg-[#1c3a13] py-20 px-4">
          <ScrollReveal className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 border border-[#fcfcf7]/20 rounded-full px-4 py-1.5 text-sm text-[#fcfcf7]/70 mb-8">
              <MapPin className="h-4 w-4" />
              <span>Northern Savannah Zone — Ghana</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-light text-[#fcfcf7] tracking-tight mb-6 leading-tight">
              Built for the people who
              <br />
              <span className="text-[#d3fa99]">grow, buy, and move</span> food
            </h1>
            <p className="text-lg text-[#fcfcf7]/70 max-w-2xl mx-auto">
              Lorgric is a farm-to-market platform connecting smallholder farmers across
              Northern Ghana directly with buyers, delivery riders, and equipment vendors —
              no middlemen, no guesswork.
            </p>
          </ScrollReveal>
        </section>

        {/* The problem */}
        <section className="py-16 px-4 bg-[#fcfcf7]">
          <div className="max-w-3xl mx-auto text-center">
            <ScrollReveal>
              <h2 className="text-3xl font-light text-[#1c3a13] tracking-tight mb-4">
                The problem we set out to fix
              </h2>
              <p className="text-[#1c3a13]/70 leading-relaxed">
                Ghana loses an estimated 20–50% of fruits and vegetables after harvest —
                produce that spoils before it ever reaches a buyer. At the same time, smallholder
                farmers in the Northern Savannah Zone are often forced to sell to middlemen at a
                fraction of market value, simply because they have no direct way to reach buyers
                or arrange reliable transport. Lorgric exists to close that gap: a single place
                where a farmer can list produce, a buyer can order it, and a rider can deliver it
                — before it spoils, at a fair price, for everyone involved.
              </p>
            </ScrollReveal>
          </div>
        </section>

        {/* Who it's for */}
        <section className="py-16 px-4 bg-[#eeeee9]">
          <div className="max-w-5xl mx-auto">
            <ScrollReveal className="text-center mb-12">
              <h2 className="text-3xl font-light text-[#1c3a13] tracking-tight">One platform, four roles</h2>
              <p className="text-[#1c3a13]/50 mt-2 text-sm">Everyone in the supply chain, connected directly</p>
            </ScrollReveal>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {ROLES.map(({ icon: Icon, title, description }, i) => (
                <ScrollReveal key={title} delay={i * 0.08}>
                  <Card className="bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl h-full">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-center w-11 h-11 rounded-full bg-[#d3fa99] mb-4">
                        <Icon className="h-5 w-5 text-[#1c3a13]" />
                      </div>
                      <h3 className="font-medium text-[#1c3a13] mb-2">{title}</h3>
                      <p className="text-sm text-[#1c3a13]/60 leading-relaxed">{description}</p>
                    </CardContent>
                  </Card>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-16 px-4 bg-[#fcfcf7]">
          <div className="max-w-5xl mx-auto">
            <ScrollReveal className="text-center mb-12">
              <h2 className="text-3xl font-light text-[#1c3a13] tracking-tight">What we stand for</h2>
            </ScrollReveal>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {VALUES.map(({ icon: Icon, title, description }, i) => (
                <ScrollReveal key={title} delay={i * 0.08}>
                  <div className="flex flex-col items-center text-center">
                    <div className="w-14 h-14 rounded-full bg-[#1c3a13] flex items-center justify-center mb-5">
                      <Icon className="h-6 w-6 text-[#d3fa99]" />
                    </div>
                    <h3 className="font-medium text-[#1c3a13] mb-2 text-base">{title}</h3>
                    <p className="text-sm text-[#1c3a13]/50 leading-relaxed">{description}</p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* Live impact */}
        <section className="py-16 px-4 bg-[#d3fa99]">
          <div className="max-w-5xl mx-auto">
            <ScrollReveal className="text-center mb-10">
              <h2 className="text-3xl font-light text-[#1c3a13] tracking-tight">Lorgric today</h2>
              <p className="text-[#1c3a13]/60 mt-2 text-sm">Live numbers from the platform</p>
            </ScrollReveal>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-[#1c3a13] text-center">
              {STATS.map(({ label, value, icon: Icon }, i) => (
                <ScrollReveal key={label} delay={i * 0.08}>
                  <div className="flex flex-col items-center gap-2">
                    <Icon className="h-6 w-6" />
                    <div className="text-3xl font-bold">{value}</div>
                    <div className="text-sm text-[#1c3a13]/70">{label}</div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-[#1c3a13] py-16 px-4 text-center">
          <ScrollReveal className="max-w-2xl mx-auto">
            <h2 className="text-4xl font-light text-[#fcfcf7] tracking-tight mb-4">
              Join Northern Ghana&apos;s Digital Farm Market
            </h2>
            <p className="text-[#fcfcf7]/70 mb-8">
              Whether you grow it, buy it, move it, or supply it — Lorgric has a place for you.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-[#fcfcf7] text-[#1c3a13] hover:bg-[#eeeee9] rounded-full">
                <Link href="/auth/register">Create Your Free Account</Link>
              </Button>
              <Button
                asChild
                size="lg"
                className="border border-[#fcfcf7]/40 text-[#fcfcf7] bg-transparent hover:bg-[#fcfcf7]/10 rounded-full"
              >
                <Link href="/marketplace">Browse the Marketplace</Link>
              </Button>
            </div>
          </ScrollReveal>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#1c3a13] border-t border-[#fcfcf7]/10 py-8 px-4 text-sm text-center text-[#fcfcf7]/60">
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="flex items-center justify-center h-6 w-6 rounded-full bg-[#d3fa99]">
            <Leaf className="h-3.5 w-3.5 text-[#1c3a13]" />
          </span>
          <span className="text-[#fcfcf7] font-medium tracking-tight">
            Lorgric<span className="text-[#d3fa99] ml-0.5">●</span>
          </span>
        </div>
        <p className="text-[#fcfcf7]/50">
          Connecting Northern Ghana&apos;s Farmers, Buyers &amp; Logistics — reducing waste, growing livelihoods.
        </p>
        <p className="mt-2 text-[#fcfcf7]/40">
          © {new Date().getFullYear()} Lorgric. Northern Savannah Zone, Ghana.
        </p>
      </footer>
    </div>
  );
}
