import Link from "next/link";
import {
  TrendingUp,
  Truck,
  ShoppingCart,
  MapPin,
  CheckCircle2,
  Users,
  Package,
  Leaf,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { HeroSlideshow } from "@/components/shared/hero-slideshow";
import { ProduceHighlightCard } from "@/components/shared/produce-highlight-card";
import { ScrollReveal } from "@/components/shared/scroll-reveal";
import { PRODUCE_HIGHLIGHTS } from "@/lib/produce-highlights";
import { getPlatformStats } from "@/lib/platform-stats";
import { auth } from "@/lib/auth";
import { getDashboardPath } from "@/lib/dashboard-path";

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Register",
    description:
      "Sign up as a farmer, buyer, or logistics provider. Create your profile in minutes.",
  },
  {
    step: "02",
    title: "List or Browse",
    description:
      "Farmers list fresh produce. Buyers browse and filter by crop, price, and location.",
  },
  {
    step: "03",
    title: "Connect & Order",
    description:
      "Buyers place orders directly with farmers. Negotiate price and quantity seamlessly.",
  },
  {
    step: "04",
    title: "Deliver",
    description:
      "Coordinate transport through our logistics network. Track delivery in real time.",
  },
];

const WHY_BENEFITS = [
  "Book a nearby cold-chain or dry storage facility instead of selling within hours of harvest",
  "Reliable riders so produce isn't lost or bruised in transit on bad feeder roads",
  "Direct farmer-to-wholesaler and farmer-to-processor connections — no seasonal gluts left to spoil unsold",
  "Storage facilities take just a 5% commission on any sale — the farmer keeps 95%",
  "AI market and handling advice, plus a rating & trust system for every party",
];

const IMPACT_METRICS = [
  { icon: TrendingUp, value: "10–50%", label: "Of harvests lost in Northern Ghana today" },
  { icon: Truck, value: "US$1.9B", label: "Lost nationally to PHL each year" },
  { icon: Users, value: "3", label: "Regions covered" },
  { icon: Package, value: "15+", label: "Crop types listed" },
];

export default async function LandingPage() {
  const session = await auth();
  const isAuthenticated = !!session?.user;
  const dashboardPath = getDashboardPath(session?.user?.role);
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
      {/* Announcement Bar */}
      <div className="w-full bg-[#d3fa99] py-2 text-center text-sm text-[#1c3a13] font-medium">
        Starting with Upper East Region tomato farmers — Ghana loses ~US$1.9B a year to post-harvest loss
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden bg-[#1c3a13] py-24 px-4">
        <HeroSlideshow />
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <div className="rounded-[2.5rem] bg-[#1c3a13]/55 backdrop-blur-sm px-6 py-10 sm:px-12">
            <div className="inline-flex items-center gap-2 border border-[#fcfcf7]/20 rounded-full px-4 py-1.5 text-sm text-[#fcfcf7]/70 mb-8">
              <MapPin className="h-4 w-4" />
              <span>Upper East Region &amp; Northern Savannah Zone — Ghana&apos;s Food Basket</span>
            </div>
            <h1 className="text-5xl sm:text-6xl font-light text-[#fcfcf7] tracking-tight mb-6 leading-tight">
              Stop the Harvest
              <br />
              from Going to
              <br />
              <span className="text-[#d3fa99]">Waste</span>
            </h1>
            <p className="text-lg sm:text-xl text-[#fcfcf7]/70 mb-10 max-w-2xl mx-auto">
              Tomato farmers in the Upper East Region lose produce at every stage — on the
              farm, with wholesalers, at retail — because there&apos;s no cold storage and
              no ready buyer. Lorgric lets them book a nearby cold-chain facility instead
              of selling within hours of harvest, reaching wholesalers and processors
              directly once it&apos;s stored. The same model covers grain farmers across
              the Northern Savannah Zone with hermetic dry storage.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {isAuthenticated ? (
              <Button
                asChild
                size="lg"
                className="bg-[#fcfcf7] text-[#1c3a13] hover:bg-[#eeeee9] rounded-full"
              >
                <Link href={dashboardPath}>Go to My Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button
                  asChild
                  size="lg"
                  className="bg-[#fcfcf7] text-[#1c3a13] hover:bg-[#eeeee9] rounded-full"
                >
                  <Link href="/auth/register?role=FARMER">
                    I&apos;m a Farmer
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  className="border border-[#fcfcf7]/40 text-[#fcfcf7] bg-transparent hover:bg-[#fcfcf7]/10 rounded-full"
                >
                  <Link href="/auth/register?role=BUYER">
                    I&apos;m a Buyer
                  </Link>
                </Button>
              </>
            )}
            <Button
              asChild
              size="lg"
              className="border border-[#fcfcf7]/40 text-[#fcfcf7] bg-transparent hover:bg-[#fcfcf7]/10 rounded-full"
            >
              <Link href="/marketplace">
                <ShoppingCart className="h-5 w-5 mr-2" />
                Browse Market
              </Link>
            </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Band */}
      <section className="bg-[#d3fa99] py-10 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-[#1c3a13] text-center">
          {STATS.map(({ label, value, icon: Icon }, i) => (
            <ScrollReveal key={label} delay={i * 0.08}>
              <div className="flex flex-col items-center gap-2">
                <Icon className="h-6 w-6 text-[#1c3a13]/50" />
                <span className="text-3xl font-bold">{value}</span>
                <span className="text-sm text-[#1c3a13]/70">{label}</span>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* Produce Grid */}
      <section className="py-16 px-4 bg-[#fcfcf7]">
        <div className="max-w-6xl mx-auto">
          <ScrollReveal className="flex items-end justify-between mb-10">
            <div>
              <h2 className="text-4xl font-light text-[#1c3a13] tracking-tight">
                Fresh on the Market
              </h2>
              <p className="text-[#1c3a13]/50 text-sm mt-2">
                Harvested this season across Northern Ghana
              </p>
            </div>
            <Button
              asChild
              variant="outline"
              className="rounded-full border-[#eeeee9] text-[#1c3a13] hover:bg-[#eeeee9] hover:border-[#1c3a13]"
            >
              <Link href="/marketplace">View All</Link>
            </Button>
          </ScrollReveal>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {PRODUCE_HIGHLIGHTS.map((item, i) => (
              <ScrollReveal key={item.name} delay={i * 0.06}>
                <ProduceHighlightCard {...item} />
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-16 px-4 bg-[#eeeee9]">
        <div className="max-w-5xl mx-auto">
          <ScrollReveal className="text-center mb-12">
            <h2 className="text-4xl font-light text-[#1c3a13] tracking-tight">
              How Lorgric Works
            </h2>
            <p className="text-[#1c3a13]/50 mt-2 text-sm">Simple steps to start trading</p>
          </ScrollReveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {HOW_IT_WORKS.map(({ step, title, description }, i) => (
              <ScrollReveal key={step} delay={i * 0.1}>
                <div className="flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-full bg-[#1c3a13] text-[#fcfcf7] flex items-center justify-center text-xl font-bold mb-5">
                    {step}
                  </div>
                  <h3 className="font-medium text-[#1c3a13] mb-2 text-base">{title}</h3>
                  <p className="text-sm text-[#1c3a13]/50 leading-relaxed">{description}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Why Lorgric */}
      <section id="about" className="py-16 px-4 bg-[#fcfcf7]">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <ScrollReveal>
              <h2 className="text-4xl font-light text-[#1c3a13] tracking-tight mb-4">
                Built to Fight<br />Post-Harvest Loss
              </h2>
              <p className="text-[#1c3a13]/70 mb-8 leading-relaxed">
                Poor storage, bad feeder roads, and a lack of ready markets — not low
                yields — are why so much of Northern Ghana&apos;s harvest never reaches a
                plate. Field studies on sorghum in the region show that closing that
                gap with better handling and faster market access cut losses from 12.4%
                to 6.6% and nearly doubled farmer income in a single season. Lorgric
                builds that same fix into the market itself.
              </p>
              <ul className="space-y-3">
                {WHY_BENEFITS.map((point) => (
                  <li key={point} className="flex items-center gap-3 text-[#1c3a13]">
                    <span className="w-5 h-5 rounded-full bg-[#d3fa99] flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="h-3 w-3 text-[#1c3a13]" />
                    </span>
                    <span className="text-sm">{point}</span>
                  </li>
                ))}
              </ul>
            </ScrollReveal>
            <div className="grid grid-cols-2 gap-4">
              {IMPACT_METRICS.map(({ icon: Icon, value, label }, i) => (
                <ScrollReveal key={label} delay={i * 0.08}>
                  <Card className="bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl">
                    <CardContent className="p-6 text-center">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#eeeee9] mx-auto mb-3">
                        <Icon className="h-5 w-5 text-[#1c3a13]" />
                      </div>
                      <div className="text-2xl font-bold text-[#1c3a13]">{value}</div>
                      <div className="text-xs text-[#1c3a13]/50 mt-1">{label}</div>
                    </CardContent>
                  </Card>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#1c3a13] py-16 px-4 text-center">
        <ScrollReveal className="max-w-2xl mx-auto">
          {isAuthenticated ? (
            <>
              <h2 className="text-4xl font-light text-[#fcfcf7] tracking-tight mb-4">
                Welcome back to Lorgric
              </h2>
              <p className="text-[#fcfcf7]/70 mb-8">
                Pick up where you left off — your dashboard has everything waiting.
              </p>
              <Button
                asChild
                size="lg"
                className="bg-[#fcfcf7] text-[#1c3a13] hover:bg-[#eeeee9] rounded-full"
              >
                <Link href={dashboardPath}>Go to My Dashboard</Link>
              </Button>
            </>
          ) : (
            <>
              <h2 className="text-4xl font-light text-[#fcfcf7] tracking-tight mb-4">
                Ready to Join Northern Ghana&apos;s Digital Farm Market?
              </h2>
              <p className="text-[#fcfcf7]/70 mb-8">
                Whether you grow it, buy it, or move it — Lorgric has a place for you.
              </p>
              <Button
                asChild
                size="lg"
                className="bg-[#fcfcf7] text-[#1c3a13] hover:bg-[#eeeee9] rounded-full"
              >
                <Link href="/auth/register">Create Your Free Account</Link>
              </Button>
            </>
          )}
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
