// Edge-safe auth config — no Prisma, no Node.js-only modules
// Used by proxy.ts which runs in the Edge Runtime
import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
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
        (session.user as unknown as Record<string, unknown>).isVendor = token.isVendor ?? false;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = nextUrl;

      const publicRoutes = ["/", "/auth/login", "/auth/register", "/login", "/register", "/marketplace", "/tracking", "/review", "/unauthorized", "/equipment"];
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
      if (pathname.startsWith("/vendor")) {
        const isVendor = (auth?.user as { isVendor?: boolean })?.isVendor;
        if (role !== "VENDOR" && role !== "ADMIN" && !isVendor) return false;
      }

      return true;
    },
  },
};
