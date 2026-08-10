"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  AlertTriangle,
  ShieldCheck,
  Menu,
  X,
  ChevronRight,
  BarChart3,
  BadgeCheck,
  MessageSquare,
  ShoppingBag,
  Warehouse,
  UserPlus,
  Dumbbell,
  ShieldAlert,
  MapPinOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SignOutButton } from "@/components/shared/signout-button";
import { useSidebarCollapse } from "@/components/shared/sidebar-collapse-context";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/listings", label: "Listing Approvals", icon: CheckSquare },
  { href: "/admin/storage-facilities", label: "Storage Facilities", icon: Warehouse },
  { href: "/admin/storage-demand", label: "Unmet Demand", icon: MapPinOff },
  { href: "/admin/complaints", label: "Complaints", icon: AlertTriangle },
  { href: "/admin/disputes", label: "Order Disputes", icon: ShieldAlert },
  { href: "/admin/repeat-offenders", label: "Repeat Offenders", icon: Users },
  { href: "/admin/verifications", label: "Verifications", icon: BadgeCheck },
  { href: "/admin/admin-requests", label: "Admin Applications", icon: UserPlus },
  { href: "/admin/incident-team-requests", label: "Macho Applications", icon: Dumbbell },
  { href: "/incident-team", label: "Incident Team Portal", icon: Dumbbell },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/messages", label: "Messages", icon: MessageSquare },
  { href: "/marketplace", label: "Marketplace", icon: ShoppingBag },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const { collapsed, toggle } = useSidebarCollapse();

  function NavContent({ collapsible = false }: { collapsible?: boolean }) {
    const isCollapsed = collapsible && collapsed;
    return (
      <>
        {/* Brand */}
        <div className={cn("flex items-center border-b border-white/10 py-5", isCollapsed ? "justify-center px-2" : "justify-between px-4")}>
          {!isCollapsed && (
            <Link href="/admin" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d3fa99]">
                <ShieldCheck className="h-5 w-5 text-[#1c3a13]" />
              </div>
              <div className="flex flex-col">
                <span className="font-medium tracking-tight text-[#fcfcf7] text-sm leading-tight">
                  Lorgric<span className="text-[#d3fa99]">●</span>
                </span>
                <span className="text-[10px] font-medium tracking-widest text-[#fcfcf7]/50 uppercase">Admin</span>
              </div>
            </Link>
          )}
          {collapsible && (
            <button
              onClick={toggle}
              className="text-[#fcfcf7]/60 hover:text-[#fcfcf7] hover:bg-white/10 rounded-lg p-1.5 transition-colors flex-shrink-0"
              aria-label={collapsed ? "Expand menu" : "Collapse menu"}
              title={collapsed ? "Expand menu" : "Collapse menu"}
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-0.5 px-2">
          {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
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
                    ? "bg-[#d3fa99] text-[#1c3a13]"
                    : "text-[#fcfcf7]/60 hover:bg-white/10 hover:text-[#fcfcf7]"
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {!isCollapsed && <span>{label}</span>}
                {!isCollapsed && active && <ChevronRight className="ml-auto h-4 w-4 text-[#1c3a13]/50" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/10 p-4 space-y-3">
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            title={isCollapsed ? (session?.user?.name ?? "Admin") : undefined}
            className={cn("flex items-center gap-3 rounded-xl -m-1 p-1 hover:bg-white/10 transition-colors", isCollapsed ? "justify-center" : "px-1")}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-[#fcfcf7] flex-shrink-0">
              {(session?.user?.name ?? "A").charAt(0).toUpperCase()}
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#fcfcf7] truncate">{session?.user?.name ?? "Admin"}</p>
                <p className="text-xs text-[#fcfcf7]/50 truncate">Administrator</p>
              </div>
            )}
          </Link>
          <SignOutButton
            iconOnly={isCollapsed}
            className={cn("rounded-full text-[#fcfcf7]/60 hover:text-[#fcfcf7] hover:bg-white/10", isCollapsed ? "w-full justify-center" : "w-full justify-start")}
          />
        </div>
      </>
    );
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden flex items-center justify-between bg-[#1c3a13] px-4 py-3">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#d3fa99]">
            <ShieldCheck className="h-4 w-4 text-[#1c3a13]" />
          </div>
          <span className="font-medium tracking-tight text-[#fcfcf7] text-sm">
            Lorgric<span className="text-[#d3fa99]">●</span>
          </span>
        </Link>
        <button onClick={() => setOpen(!open)} className="text-[#fcfcf7]/60 hover:text-[#fcfcf7] p-1" aria-label="Toggle menu">
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setOpen(false)} />}

      <div className={cn(
        "lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-[#1c3a13] flex flex-col transform transition-transform duration-200",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        <NavContent />
      </div>

      <div className={cn(
        "hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex-col bg-[#1c3a13] transition-[width] duration-200",
        collapsed ? "lg:w-20" : "lg:w-64"
      )}>
        <NavContent collapsible />
      </div>
    </>
  );
}
