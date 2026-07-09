"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ProductImageSlideshowProps {
  images: string[];
  alt: string;
  fallbackEmoji?: string;
  autoAdvanceMs?: number;
  className?: string;
  priority?: boolean;
}

export function ProductImageSlideshow({
  images,
  alt,
  fallbackEmoji = "🌾",
  autoAdvanceMs = 4000,
  className = "",
  priority = false,
}: ProductImageSlideshowProps) {
  const [idx, setIdx] = useState(0);
  const [direction, setDirection] = useState(1);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const validImages = images.filter(Boolean);
  const count = validImages.length;

  const go = useCallback(
    (next: number, dir: number) => {
      setDirection(dir);
      setIdx((next + count) % count);
    },
    [count]
  );

  // Auto-advance
  useEffect(() => {
    if (count <= 1 || paused) return;
    timerRef.current = setTimeout(() => go(idx + 1, 1), autoAdvanceMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [idx, count, paused, autoAdvanceMs, go]);

  if (count === 0) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 ${className}`}
      >
        <span className="text-7xl select-none">{fallbackEmoji}</span>
      </div>
    );
  }

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? "60%" : "-60%", opacity: 0, scale: 0.96 }),
    center: { x: 0, opacity: 1, scale: 1 },
    exit: (d: number) => ({ x: d > 0 ? "-60%" : "60%", opacity: 0, scale: 0.96 }),
  };

  return (
    <div
      className={`relative overflow-hidden group ${className}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Image layer */}
      <AnimatePresence custom={direction} initial={false}>
        <motion.div
          key={idx}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.38, ease: [0.32, 0.72, 0, 1] }}
          className="absolute inset-0"
        >
          <Image
            src={validImages[idx]}
            alt={`${alt} – photo ${idx + 1}`}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover object-center"
            priority={priority && idx === 0}
            onError={(e) => {
              // Hide broken images gracefully
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
          {/* Subtle dark gradient at bottom for legibility */}
          <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
        </motion.div>
      </AnimatePresence>

      {/* Prev / Next arrows — only show if multiple images */}
      {count > 1 && (
        <>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); go(idx - 1, -1); }}
            aria-label="Previous image"
            className="absolute left-1.5 top-1/2 -translate-y-1/2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/60"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); go(idx + 1, 1); }}
            aria-label="Next image"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/60"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      )}

      {/* Dot indicators — only show if multiple images */}
      {count > 1 && (
        <div className="absolute bottom-2 left-0 right-0 z-10 flex items-center justify-center gap-1.5">
          {validImages.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); go(i, i > idx ? 1 : -1); }}
              aria-label={`Photo ${i + 1}`}
              className={`rounded-full transition-all duration-200 ${
                i === idx
                  ? "w-4 h-1.5 bg-white"
                  : "w-1.5 h-1.5 bg-white/55 hover:bg-white/80"
              }`}
            />
          ))}
        </div>
      )}

      {/* Photo count badge */}
      {count > 1 && (
        <div className="absolute top-2 right-2 z-10 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity">
          {idx + 1}/{count}
        </div>
      )}
    </div>
  );
}
