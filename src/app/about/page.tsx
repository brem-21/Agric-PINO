import Link from "next/link";
import type { Metadata } from "next";
import {
  Leaf,
  Users,
  Package,
  Truck,
  MapPin,
  ShoppingCart,
  Warehouse,
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
    "Lorgric exists to reduce post-harvest losses in Ghana's Northern Savannah Zone — starting with tomato farmers in the Upper East Region — connecting them directly with wholesalers, processors, delivery riders, and cold-chain storage facilities before produce spoils.",
};

const ROLES = [
  {
    icon: Leaf,
    title: "Farmers",
    description:
      "List your harvest the day it's picked, or book a drop-off at a nearby storage facility, and reach a wholesaler or processor directly — no more selling within hours of harvest at whatever price is offered.",
  },
  {
    icon: ShoppingCart,
    title: "Buyers",
    description:
      "Wholesalers, processors, and retailers browse produce by crop, price, location — and how soon it needs to sell. Order directly, or from a storage facility, and track delivery from pickup to doorstep.",
  },
  {
    icon: Truck,
    title: "Delivery Riders",
    description:
      "Move produce fast over Northern Ghana's feeder roads — the single biggest cause of bruising and spoilage in transit — and get paid per job.",
  },
  {
    icon: Warehouse,
    title: "Storage Facilities",
    description:
      "Operate a cold-chain or hermetic dry storage site. Take farmer drop-off bookings, hold produce until a buyer is found, and earn a 5% commission on every sale.",
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
    title: "Speed over spoilage",
    description: "Every workflow is built to shorten the time between harvest and sale — the single biggest lever against post-harvest loss.",
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
              A platform built to
              <br />
              <span className="text-[#d3fa99]">stop the harvest from rotting</span>
            </h1>
            <p className="text-lg text-[#fcfcf7]/70 max-w-2xl mx-auto">
              We&apos;re helping tomato farmers in Ghana&apos;s Upper East Region reach
              wholesalers and processors before their harvest spoils — by storing it at
              nearby cold-chain facilities instead of selling within hours of harvest at
              whatever price is offered. The same model extends to grain farmers across
              the Northern Savannah Zone, with hermetic dry storage and delivery riders
              connecting them directly to buyers too.
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
                Smallholder farmers in Northern Ghana lose an estimated 10–50% of every
                harvest before it reaches a consumer — costing the country roughly US$1.9
                billion a year (APHLIS, WFP). It isn&apos;t poor farming that causes this:
                it&apos;s poor storage, damaged feeder roads, no cold chain, and — the single
                biggest factor farmers and traders report — no ready market to sell into
                before produce spoils. A study of the Upper East tomato value chain found
                losses compounding at every stage: ~10–13% on the farm, 26% with
                wholesalers, 20% at retail. Lorgric exists to close that gap: a farmer books
                a drop-off at a nearby storage facility instead of selling immediately, the
                facility holds the produce until a wholesaler or processor buys it, and
                everyone — farmer, facility, buyer — comes out ahead of what today&apos;s
                sell-it-now-or-lose-it market offers.
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
          Fighting post-harvest loss in Northern Ghana — connecting farmers, buyers, riders &amp; storage facilities.
        </p>
        <p className="mt-2 text-[#fcfcf7]/40">
          © {new Date().getFullYear()} Lorgric. Northern Savannah Zone, Ghana.
        </p>
      </footer>
    </div>
  );
}
