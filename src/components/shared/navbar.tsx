"use client"

import * as React from "react"
import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { Leaf, Menu, X, ChevronDown, LayoutDashboard, LogOut, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { getDashboardPath } from "@/lib/dashboard-path"

const navLinks = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/about", label: "About" },
]

// Quick links surfaced in the navbar once a role is known — mirrors each role's own sidebar top items.
const ROLE_NAV_LINKS: Record<string, { href: string; label: string }[]> = {
  FARMER: [
    { href: "/farmer/listings", label: "My Listings" },
    { href: "/farmer/orders", label: "Orders" },
  ],
  BUYER: [
    { href: "/buyer/orders", label: "My Orders" },
  ],
  VENDOR: [
    { href: "/vendor/products", label: "My Products" },
    { href: "/vendor/orders", label: "Orders" },
  ],
  LOGISTICS: [
    { href: "/logistics/requests", label: "Transport Requests" },
    { href: "/logistics/deliveries", label: "Deliveries" },
  ],
  ADMIN: [
    { href: "/admin/users", label: "Users" },
    { href: "/admin/verifications", label: "Verifications" },
  ],
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export default function Navbar() {
  const { data: session, status } = useSession()
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const [dropdownOpen, setDropdownOpen] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Close mobile menu on route change (resize guard)
  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setMobileOpen(false)
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const isLoading = status === "loading"
  const isAuthenticated = status === "authenticated"
  const user = session?.user
  const role = (user as { role?: string })?.role
  const dashboardPath = getDashboardPath(role)
  const displayedLinks = isAuthenticated
    ? [{ href: dashboardPath, label: "Portal" }, ...navLinks, ...(ROLE_NAV_LINKS[role ?? ""] ?? [])]
    : navLinks

  return (
    <div className="sticky top-4 z-50 px-4">
      <div className="mx-auto max-w-5xl rounded-full border border-[#eeeee9] bg-[#fcfcf7] px-6 py-3 flex items-center justify-between">
        {/* Logo — always leads to the landing page */}
        <Link
          href="/"
          className="flex items-center gap-2 transition-colors"
        >
          <span className="flex items-center justify-center h-7 w-7 rounded-full bg-[#d3fa99]">
            <Leaf className="h-4 w-4 text-[#1c3a13]" />
          </span>
          <span className="text-xl font-medium tracking-tight text-[#1c3a13]">
            Lorgric<span className="text-[#d3fa99] ml-0.5">●</span>
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-6">
          {displayedLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-[#1c3a13]/70 hover:text-[#1c3a13] transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop Auth */}
        <div className="hidden md:flex items-center gap-3">
          {isLoading ? (
            <div className="h-8 w-24 animate-pulse rounded-full bg-[#eeeee9]" />
          ) : isAuthenticated && user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2 rounded-full border border-[#eeeee9] bg-[#fcfcf7] px-3 py-1.5 text-sm font-medium text-[#1c3a13] hover:border-[#1c3a13] hover:bg-[#eeeee9] transition-colors focus:outline-none focus:ring-2 focus:ring-[#1c3a13]"
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
              >
                {user.image ? (
                  <img
                    src={user.image}
                    alt={user.name ?? "User avatar"}
                    className="h-7 w-7 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1c3a13] text-xs font-semibold text-[#fcfcf7]">
                    {getInitials(user.name ?? "U")}
                  </span>
                )}
                <span className="max-w-[120px] truncate">{user.name}</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-[#1c3a13]/40 transition-transform duration-200",
                    dropdownOpen && "rotate-180"
                  )}
                />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-[#eeeee9] bg-[#fcfcf7] py-1">
                  <div className="border-b border-[#eeeee9] px-4 py-2">
                    <p className="text-xs text-[#1c3a13]/50">Signed in as</p>
                    <p className="truncate text-sm font-medium text-[#1c3a13]">{(user as { phone?: string })?.phone ?? user.name}</p>
                  </div>
                  <Link
                    href={dashboardPath}
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-[#1c3a13] hover:bg-[#eeeee9] transition-colors"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </Link>
                  <Link
                    href="/profile"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-[#1c3a13] hover:bg-[#eeeee9] transition-colors"
                  >
                    <User className="h-4 w-4" />
                    My Profile
                  </Link>
                  <div className="border-t border-[#eeeee9] mt-1 pt-1">
                    <button
                      onClick={() => {
                        setDropdownOpen(false)
                        signOut({ callbackUrl: "/" })
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="text-[#1c3a13] hover:text-[#1c3a13] hover:bg-[#eeeee9] rounded-full"
              >
                <Link href="/auth/login">Login</Link>
              </Button>
              <Button
                size="sm"
                asChild
                className="bg-[#1c3a13] text-[#fcfcf7] hover:bg-[#2a5219] rounded-full"
              >
                <Link href="/auth/register">Register</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile Hamburger */}
        <button
          className="flex items-center justify-center rounded-full p-2 text-[#1c3a13] hover:bg-[#eeeee9] transition-colors md:hidden focus:outline-none focus:ring-2 focus:ring-[#1c3a13]"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="mx-auto mt-2 max-w-5xl rounded-2xl border border-[#eeeee9] bg-[#fcfcf7] md:hidden">
          <div className="px-4 py-4 space-y-1">
            {displayedLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block rounded-full px-3 py-2 text-base font-medium text-[#1c3a13]/70 hover:bg-[#eeeee9] hover:text-[#1c3a13] transition-colors"
              >
                {link.label}
              </Link>
            ))}

            <div className="border-t border-[#eeeee9] pt-3 mt-3">
              {isLoading ? (
                <div className="h-10 w-full animate-pulse rounded-full bg-[#eeeee9]" />
              ) : isAuthenticated && user ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-3 px-3 py-2">
                    {user.image ? (
                      <img
                        src={user.image}
                        alt={user.name ?? "User"}
                        className="h-9 w-9 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1c3a13] text-sm font-semibold text-[#fcfcf7]">
                        {getInitials(user.name ?? "U")}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[#1c3a13]">{user.name}</p>
                      <p className="truncate text-xs text-[#1c3a13]/50">{(user as { phone?: string })?.phone}</p>
                    </div>
                  </div>
                  <Link
                    href={dashboardPath}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-[#1c3a13] hover:bg-[#eeeee9] transition-colors"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </Link>
                  <Link
                    href="/profile"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-[#1c3a13] hover:bg-[#eeeee9] transition-colors"
                  >
                    <User className="h-4 w-4" />
                    My Profile
                  </Link>
                  <button
                    onClick={() => {
                      setMobileOpen(false)
                      signOut({ callbackUrl: "/" })
                    }}
                    className="flex w-full items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    asChild
                    className="w-full rounded-full border-[#eeeee9] text-[#1c3a13] hover:bg-[#eeeee9]"
                  >
                    <Link href="/auth/login" onClick={() => setMobileOpen(false)}>
                      Login
                    </Link>
                  </Button>
                  <Button
                    asChild
                    className="w-full rounded-full bg-[#1c3a13] text-[#fcfcf7] hover:bg-[#2a5219]"
                  >
                    <Link href="/auth/register" onClick={() => setMobileOpen(false)}>
                      Register
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
