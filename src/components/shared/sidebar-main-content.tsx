"use client";

import { cn } from "@/lib/utils";
import { useSidebarCollapse } from "./sidebar-collapse-context";

export function SidebarMainContent({ children, className }: { children: React.ReactNode; className?: string }) {
  const { collapsed } = useSidebarCollapse();
  return (
    <div className={cn(collapsed ? "lg:pl-20" : "lg:pl-64", "transition-[padding] duration-200", className)}>
      {children}
    </div>
  );
}
