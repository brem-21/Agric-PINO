"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { ShoppingBag, LogIn, UserPlus } from "lucide-react";

interface ProduceHighlightCardProps {
  name: string;
  image: string;
  region: string;
  price: string;
}

export function ProduceHighlightCard({ name, image, region, price }: ProduceHighlightCardProps) {
  const { status } = useSession();
  const authed = status === "authenticated";

  return (
    <div className="group relative h-48 rounded-2xl overflow-hidden border border-[#eeeee9] hover:border-[#1c3a13] transition-colors">
      {/* Base card — clear image, always visible */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image} alt={name} className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      <div className="relative flex h-full flex-col justify-end p-4 text-center">
        <div className="font-medium text-white text-sm">{name}</div>
        <div className="text-xs text-white/70 mt-0.5">{region}</div>
        <div className="text-white font-bold text-sm mt-2">{price}</div>
      </div>

      {/* Hover tooltip — blurred background, product info, and an auth-aware CTA */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none group-hover:pointer-events-auto">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-110 object-cover blur-md" />
        <div className="absolute inset-0 bg-[#1c3a13]/80" />
        <div className="relative flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
          <p className="font-medium text-white">{name}</p>
          <p className="text-xs text-white/70">{region} · {price}</p>
          {authed ? (
            <Link
              href="/marketplace"
              className="mt-1 flex items-center gap-1.5 rounded-full bg-[#d3fa99] text-[#1c3a13] text-xs font-medium px-3 py-1.5 hover:bg-white transition-colors"
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              View in Marketplace
            </Link>
          ) : (
            <div className="flex flex-col items-center gap-1.5 mt-1">
              <Link
                href="/auth/login"
                className="flex items-center gap-1.5 rounded-full bg-[#d3fa99] text-[#1c3a13] text-xs font-medium px-3 py-1.5 hover:bg-white transition-colors"
              >
                <LogIn className="h-3.5 w-3.5" />
                Sign In
              </Link>
              <Link
                href="/auth/register"
                className="flex items-center gap-1 text-xs text-white/70 hover:text-white underline underline-offset-2"
              >
                <UserPlus className="h-3 w-3" />
                Create an account
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
