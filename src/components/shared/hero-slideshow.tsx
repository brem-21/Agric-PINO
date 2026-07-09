"use client";

import { useEffect, useState } from "react";

// Real photographs of Northern-Ghana-style smallholder farming (Wiki Loves Africa /
// Wikimedia Commons, CC BY-SA) — a deliberate mix of activities and people so the
// hero doesn't read as a single stock photo.
const SLIDES = [
  {
    src: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/A_farmer_ploughing.jpg/1280px-A_farmer_ploughing.jpg",
    alt: "Farmer preparing his oxen to plough a field in Ghana",
  },
  {
    src: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Maize_farmer.jpg/1280px-Maize_farmer.jpg",
    alt: "Farmer with a freshly harvested pile of maize",
  },
  {
    src: "https://upload.wikimedia.org/wikipedia/commons/2/23/A_lady_milking_a_cow.png",
    alt: "Woman milking a cow at a Northern Ghana homestead",
  },
  {
    src: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/A_farmer_filling_his_watertank_for_irrigation.jpg/1280px-A_farmer_filling_his_watertank_for_irrigation.jpg",
    alt: "Farmer setting up irrigation for his field",
  },
  {
    src: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/HARVESTING_CUCUMBER.jpg/960px-HARVESTING_CUCUMBER.jpg",
    alt: "Farmer harvesting cucumbers by hand",
  },
  {
    src: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Men_in_farming.jpg/1280px-Men_in_farming.jpg",
    alt: "Farmer standing in a cleared field, hoe in hand",
  },
  {
    src: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/01/Vegetable_Seller_Tamale%2C_Northern_Ghana.jpg/1280px-Vegetable_Seller_Tamale%2C_Northern_Ghana.jpg",
    alt: "Vegetable seller at a market in Tamale, Northern Ghana",
  },
  {
    src: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/An_okada_man_with_his_passenger_that_just_alighted.jpg/1280px-An_okada_man_with_his_passenger_that_just_alighted.jpg",
    alt: "Motorbike rider ready for a delivery run in Northern Ghana",
  },
];

const INTERVAL_MS = 5000;

export function HeroSlideshow() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {SLIDES.map((slide, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={slide.src}
          src={slide.src}
          alt={slide.alt}
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-in-out"
          style={{ opacity: i === index ? 1 : 0 }}
        />
      ))}
      {/* Light wash so photos stay clearly visible — the text block carries its own backdrop for contrast */}
      <div className="absolute inset-0 bg-[#1c3a13]/35" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#1c3a13]/50 via-transparent to-[#1c3a13]/30" />
    </div>
  );
}
