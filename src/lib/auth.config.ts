// Edge-safe auth config — no Prisma, no Node.js-only modules
// Used by proxy.ts which runs in the Edge Runtime
import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  // Auth.js validates the incoming request's Host header against its own
  // trusted-host check, independent of NEXTAUTH_URL — without this it rejects
  // any host that isn't what it auto-detects as "trusted" (e.g. a bare EC2
  // IP), throwing UntrustedHost even when NEXTAUTH_URL is set correctly.
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
  providers: [],
  callbacks: {
    async session({ session, token }) {
      if (token) {
        (session.user as unknown as Record<string, unknown>).role = token.role;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = nextUrl;

      const publicRoutes = ["/", "/auth/login", "/auth/register", "/login", "/register", "/marketplace", "/tracking", "/review", "/unauthorized"];
      const isPublic = publicRoutes.some(
        (r) => pathname === r || pathname.startsWith(`${r}/`)
      );

      if (isPublic) return true;
      if (!isLoggedIn) return false;

      const role = (auth?.user as { role?: string })?.role;

      if (pathname.startsWith("/farmer") && role !== "FARMER" && role !== "ADMIN") return false;
      if (pathname.startsWith("/buyer") && role !== "BUYER" && role !== "ADMIN") return false;
      if (pathname.startsWith("/logistics") && role !== "LOGISTICS" && role !== "ADMIN") return false;
      if (pathname.startsWith("/admin") && role !== "ADMIN") return false;
      if (pathname.startsWith("/storage") && role !== "STORAGE_FACILITY" && role !== "ADMIN") return false;

      return true;
    },
  },
};
