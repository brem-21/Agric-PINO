"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/shared/signout-button";
import {
  Dumbbell,
  LayoutDashboard,
  AlertTriangle,
  Users,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AvatarWithStatus } from "@/components/shared/online-indicator";
import { useSidebarCollapse } from "@/components/shared/sidebar-collapse-context";

const NAV_ITEMS = [
  { href: "/incident-team", label: "Dashboard", icon: LayoutDashboard },
  { href: "/incident-team/complaints", label: "Complaints", icon: AlertTriangle },
  { href: "/incident-team/repeat-offenders", label: "Repeat Offenders", icon: Users },
];

interface IncidentTeamSidebarProps {
  user: { name: string; phone: string; image?: string | null };
}

export default function IncidentTeamSidebar({ user }: IncidentTeamSidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { collapsed, toggle } = useSidebarCollapse();

  function NavContent({ collapsible = false }: { collapsible?: boolean }) {
    const isCollapsed = collapsible && collapsed;
    return (
      <>
        <div className={cn("flex items-center border-b border-white/10 py-5", isCollapsed ? "justify-center px-2" : "justify-between px-4")}>
          {!isCollapsed && (
            <Link href="/incident-team" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#fecaca]">
                <Dumbbell className="h-5 w-5 text-[#7f1d1d]" />
              </div>
              <span className="font-medium text-[#fef2f2] text-sm tracking-tight leading-tight">
                Macho Men<br />Association
              </span>
            </Link>
          )}
          {collapsible && (
            <button
              onClick={toggle}
              className="text-[#fef2f2]/60 hover:text-[#fef2f2] hover:bg-white/10 rounded-lg p-1.5 transition-colors flex-shrink-0"
              aria-label={collapsed ? "Expand menu" : "Collapse menu"}
              title={collapsed ? "Expand menu" : "Collapse menu"}
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
        </div>

        <nav className="flex-1 py-4 space-y-1 px-2">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active =
              pathname === href ||
              (href !== "/incident-team" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                title={isCollapsed ? label : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-full py-2.5 text-sm font-medium transition-colors",
                  isCollapsed ? "justify-center px-2" : "px-3",
                  active
                    ? "bg-[#fecaca] text-[#7f1d1d]"
                    : "text-[#fef2f2]/60 hover:bg-white/10 hover:text-[#fef2f2]"
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!isCollapsed && <span>{label}</span>}
                {!isCollapsed && active && <ChevronRight className="ml-auto h-4 w-4 text-[#7f1d1d]/50" />}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4 space-y-3">
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            title={isCollapsed ? user.name : undefined}
            className={cn("flex items-center gap-3 rounded-xl -m-1 p-1 hover:bg-white/10 transition-colors", isCollapsed && "justify-center")}
          >
            <AvatarWithStatus name={user.name} image={user.image} ownStatus={true} size="md" bgColor="bg-[#fecaca]" />
            {!isCollapsed && (
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#fef2f2] truncate">{user.name}</p>
                <p className="text-xs text-[#fef2f2]/50 truncate">{user.phone}</p>
              </div>
            )}
          </Link>
          <SignOutButton
            iconOnly={isCollapsed}
            className={cn("text-[#fef2f2]/60 hover:text-[#fef2f2] hover:bg-white/10 rounded-full", isCollapsed ? "w-full justify-center" : "w-full justify-start")}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="lg:hidden flex items-center justify-between bg-[#7f1d1d] px-4 py-3">
        <Link href="/incident-team" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#fecaca]">
            <Dumbbell className="h-4 w-4 text-[#7f1d1d]" />
          </div>
          <span className="font-medium text-[#fef2f2] tracking-tight text-sm">Macho Men Association</span>
        </Link>
        <button
          onClick={() => setOpen(!open)}
          className="text-[#fef2f2]/60 hover:text-[#fef2f2] p-1"
          aria-label="Toggle menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setOpen(false)} />
      )}

      <div
        className={cn(
          "lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-[#7f1d1d] flex flex-col transform transition-transform duration-200",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <NavContent />
      </div>

      <div className={cn(
        "hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex-col bg-[#7f1d1d] transition-[width] duration-200",
        collapsed ? "lg:w-20" : "lg:w-64"
      )}>
        <NavContent collapsible />
      </div>
    </>
  );
}
