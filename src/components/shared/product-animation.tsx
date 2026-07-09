import { PRODUCE_HIGHLIGHTS } from "@/lib/produce-highlights";

// Marquee of real produce photos for the login/register pages.
export function ProductMarquee() {
  const items = [...PRODUCE_HIGHLIGHTS, ...PRODUCE_HIGHLIGHTS];
  return (
    <div className="overflow-hidden whitespace-nowrap">
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .marquee-inner { animation: marquee 22s linear infinite; display: inline-flex; gap: 0.75rem; }
      `}</style>
      <div className="marquee-inner">
        {items.map((p, i) => (
          <span key={i} className="inline-flex items-center gap-2 text-sm text-white/80 font-medium pl-1.5 pr-3 py-1.5 rounded-full bg-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.image} alt="" className="h-6 w-6 rounded-full object-cover flex-shrink-0" />
            {p.name}
          </span>
        ))}
      </div>
    </div>
  );
}
