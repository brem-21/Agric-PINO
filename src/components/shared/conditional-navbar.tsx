"use client";

import { usePathname } from "next/navigation";
import Navbar from "./navbar";

// The public Navbar only belongs on the landing page.
export function ConditionalNavbar() {
  const pathname = usePathname();
  if (pathname !== "/") return null;
  return <Navbar />;
}
