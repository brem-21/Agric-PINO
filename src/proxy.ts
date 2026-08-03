import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

// Prefixes that require at least being signed in — everything else (including
// genuinely nonexistent routes) falls through to normal Next.js routing, so
// unmatched paths 404 for anonymous visitors instead of bouncing to login.
// /delivery has no auth check of its own (it renders PII straight from the
// order id with no session gate), so it stays behind this list too.
const PROTECTED_PREFIXES = ["/farmer", "/buyer", "/logistics", "/admin", "/storage", "/delivery"];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
  if (isProtected && !req.auth) {
    return Response.redirect(new URL("/auth/login", req.url));
  }

  const role = (req.auth?.user as { role?: string } | undefined)?.role;

  if (role) {
    if (pathname.startsWith("/farmer") && role !== "FARMER" && role !== "ADMIN")
      return Response.redirect(new URL("/unauthorized", req.url));
    if (pathname.startsWith("/buyer") && role !== "BUYER" && role !== "ADMIN")
      return Response.redirect(new URL("/unauthorized", req.url));
    if (pathname.startsWith("/logistics") && role !== "LOGISTICS" && role !== "ADMIN")
      return Response.redirect(new URL("/unauthorized", req.url));
    // /admin/pending is reachable by any authenticated role — it's where a BUYER
    // who applied for admin checks their application status.
    if (pathname.startsWith("/admin") && pathname !== "/admin/pending" && role !== "ADMIN")
      return Response.redirect(new URL("/unauthorized", req.url));
    if (pathname.startsWith("/storage") && role !== "STORAGE_FACILITY" && role !== "ADMIN")
      return Response.redirect(new URL("/unauthorized", req.url));
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|images).*)"],
};
