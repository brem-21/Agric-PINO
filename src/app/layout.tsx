import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lorgric — Farm-to-Market Platform",
  description:
    "Connecting smallholder farmers in Ghana's Northern Savannah Zone with buyers and logistics providers. Fresh produce, fair prices, reliable delivery.",
  keywords: ["agriculture", "Ghana", "Northern Ghana", "farm to market", "produce marketplace"],
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
