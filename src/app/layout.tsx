import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lorgric — Fighting Post-Harvest Loss in Northern Ghana",
  description:
    "Lorgric connects smallholder farmers in Ghana's Northern Savannah Zone directly with buyers, riders, and processors — getting produce to market before it spoils and cutting the post-harvest losses that cost the region up to 50% of every harvest.",
  keywords: [
    "post-harvest loss",
    "agriculture",
    "Ghana",
    "Northern Ghana",
    "farm to market",
    "produce marketplace",
    "food security",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#fcfcf7] text-[#1c3a13]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
