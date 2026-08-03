"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Leaf } from "lucide-react";

export type LoadingRole = "FARMER" | "BUYER" | "LOGISTICS" | "STORAGE_FACILITY" | "ADMIN";

interface RoleLoadingScreenProps {
  role: LoadingRole;
  mode: "login" | "logout";
  onDone: () => void;
}

const FRAME_MS = 820;

// ── Role config ──────────────────────────────────────────────────────────────

const THEMES: Record<
  LoadingRole,
  { bar: string; login: string[]; logout: string[] }
> = {
  FARMER: {
    bar: "bg-[#d3fa99]",
    login: ["Preparing the fields…", "Checking your harvest…", "Welcome back, farmer!"],
    logout: ["Saving farm data…", "See you at harvest!"],
  },
  BUYER: {
    bar: "bg-[#d3fa99]",
    login: ["Loading fresh produce…", "Finding farms near you…", "Ready to explore!"],
    logout: ["Saving your session…", "See you soon!"],
  },
  LOGISTICS: {
    bar: "bg-[#d3fa99]",
    login: ["Planning your routes…", "Checking pickups…", "Time to ride!"],
    logout: ["Clocking out…", "Rest up, rider!"],
  },
  STORAGE_FACILITY: {
    bar: "bg-[#d3fa99]",
    login: ["Opening the facility…", "Checking bookings…", "Ready to receive produce!"],
    logout: ["Locking up…", "See you tomorrow!"],
  },
  ADMIN: {
    bar: "bg-[#d3fa99]",
    login: ["Loading admin panel…", "Verifying permissions…", "Access granted!"],
    logout: ["Securing session…", "Goodbye!"],
  },
};

// Real photographs (Wikimedia Commons / Unsplash, CC BY-SA / free license) standing
// in for each role — Northern-Ghana-style farming, market, and delivery scenes rather
// than illustrated stand-ins.
const ROLE_PHOTOS: Record<LoadingRole, { src: string; alt: string }> = {
  FARMER: {
    src: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/A_farmer_ploughing.jpg/960px-A_farmer_ploughing.jpg",
    alt: "Farmer preparing his oxen to plough a field in Ghana",
  },
  BUYER: {
    src: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/01/Vegetable_Seller_Tamale%2C_Northern_Ghana.jpg/960px-Vegetable_Seller_Tamale%2C_Northern_Ghana.jpg",
    alt: "Vegetable seller at a market in Tamale, Northern Ghana",
  },
  LOGISTICS: {
    src: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/An_okada_man_with_his_passenger_that_just_alighted.jpg/960px-An_okada_man_with_his_passenger_that_just_alighted.jpg",
    alt: "Motorbike rider ready for a delivery run",
  },
  STORAGE_FACILITY: {
    src: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/01/Vegetable_Seller_Tamale%2C_Northern_Ghana.jpg/960px-Vegetable_Seller_Tamale%2C_Northern_Ghana.jpg",
    alt: "Produce ready for storage and sale at a market in Northern Ghana",
  },
  ADMIN: {
    src: "https://images.unsplash.com/photo-1759752394755-1241472b589d?w=800&q=80",
    alt: "Administrator reviewing platform data on a laptop",
  },
};

function PhotoScene({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl">
      <motion.img
        src={src}
        alt={alt}
        className="absolute inset-0 h-full w-full object-cover"
        initial={{ scale: 1.15 }}
        animate={{ scale: 1 }}
        transition={{ duration: 3.5, ease: "easeOut" }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#1c3a13]/55 via-transparent to-transparent" />
      <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-2xl" />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function RoleLoadingScreen({ role, mode, onDone }: RoleLoadingScreenProps) {
  const theme = THEMES[role] ?? THEMES.BUYER;
  const labels = mode === "login" ? theme.login : theme.logout;
  const photo = ROLE_PHOTOS[role] ?? ROLE_PHOTOS.BUYER;

  const [labelIdx, setLabelIdx] = useState(0);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    labels.forEach((_, i) => {
      if (i === 0) return;
      timers.push(setTimeout(() => setLabelIdx(i), i * FRAME_MS));
    });

    const totalMs = labels.length * FRAME_MS;
    timers.push(
      setTimeout(() => setExiting(true), totalMs),
      setTimeout(onDone, totalMs + 340)
    );

    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const progressPct = ((labelIdx + 1) / labels.length) * 100;

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden bg-[#1c3a13]"
      initial={{ opacity: 1 }}
      animate={{ opacity: exiting ? 0 : 1 }}
      transition={{ duration: 0.34, ease: "easeInOut" }}
    >
      {/* Logo */}
      <div className="absolute top-7 flex items-center gap-2.5 z-10">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#d3fa99]">
          <Leaf className="h-5 w-5 text-[#1c3a13]" />
        </div>
        <span className="text-[#fcfcf7] font-medium text-lg tracking-tight">Lorgric</span>
      </div>

      {/* Scene photo */}
      <div className="w-full max-w-xs h-44 relative">
        <PhotoScene {...photo} />
      </div>

      {/* Cycling label */}
      <div className="mt-6 h-8 flex items-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={labelIdx}
            className="text-center text-lg font-medium text-[#fcfcf7]/90 px-8"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28 }}
          >
            {labels[labelIdx]}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Step dots */}
      <div className="mt-5 flex items-center gap-2">
        {labels.map((_, i) => (
          <motion.div
            key={i}
            className={`h-2 rounded-full ${i <= labelIdx ? "bg-[#d3fa99]" : "bg-[#fcfcf7]/25"}`}
            animate={{ width: i === labelIdx ? 28 : 8 }}
            transition={{ duration: 0.25 }}
          />
        ))}
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-8 left-10 right-10 h-[3px] overflow-hidden rounded-full bg-[#fcfcf7]/15">
        <motion.div
          className={`h-full rounded-full ${theme.bar}`}
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: (FRAME_MS / 1000) * 0.88, ease: "linear" }}
        />
      </div>
    </motion.div>
  );
}
