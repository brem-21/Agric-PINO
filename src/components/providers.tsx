"use client";

import { SessionProvider } from "next-auth/react";
import { AnalyticsTracker } from "@/components/shared/analytics-tracker";
import { ConditionalNavbar } from "@/components/shared/conditional-navbar";
import { CartProvider } from "@/components/shared/cart-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <CartProvider>
        <AnalyticsTracker />
        <ConditionalNavbar />
        {children}
      </CartProvider>
    </SessionProvider>
  );
}
