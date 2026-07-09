import NextAuth, { CredentialsSignin } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { authConfig } from "./auth.config";
import type { UserRole } from "@prisma/client";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;

class TooManyAttemptsSignin extends CredentialsSignin {
  code = "too-many-attempts";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        phone: { label: "Phone", type: "tel" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.phone || !credentials?.password) return null;
        const phone = credentials.phone as string;

        // Rate-limit by phone regardless of whether the account exists, so
        // the lockout itself can't be used to enumerate valid phone numbers.
        const recentFailures = await prisma.loginAttempt.count({
          where: {
            phone,
            success: false,
            createdAt: { gte: new Date(Date.now() - LOCKOUT_WINDOW_MS) },
          },
        });
        if (recentFailures >= MAX_FAILED_ATTEMPTS) {
          throw new TooManyAttemptsSignin();
        }

        const user = await prisma.user.findUnique({ where: { phone } });

        const isValid =
          user?.password && (await bcrypt.compare(credentials.password as string, user.password));

        await prisma.loginAttempt.create({ data: { phone, success: !!isValid } });

        if (!user || !user.password || !isValid) return null;

        return {
          id: user.id,
          name: user.name,
          phone: user.phone,
          role: user.role,
          image: user.image,
          isVerified: user.isVerified,
          isVendor: user.isVendor,
          verifiedAt: user.verifiedAt?.toISOString() ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session: updatedSession }) {
      if (user) {
        const u = user as {
          role: UserRole;
          phone?: string;
          image?: string | null;
          isVerified?: boolean;
          isVendor?: boolean;
          verifiedAt?: string | null;
        };
        token.role = u.role;
        token.id = user.id;
        token.phone = u.phone;
        token.image = u.image ?? null;
        token.isVerified = u.isVerified ?? false;
        token.isVendor = u.isVendor ?? false;
        token.verifiedAt = u.verifiedAt ?? null;
      }
      // Allow client-side session.update() to refresh the image
      if (trigger === "update" && updatedSession?.image !== undefined) {
        token.image = updatedSession.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.phone = token.phone as string | undefined;
        session.user.image = (token.image as string | null) ?? null;
        session.user.isVerified = token.isVerified as boolean;
        session.user.isVendor = (token.isVendor as boolean) ?? false;
        session.user.verifiedAt = token.verifiedAt as string | null;
      }
      return session;
    },
  },
});

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      image?: string | null;
      role: UserRole;
      phone?: string;
      isVerified: boolean;
      isVendor: boolean;
      verifiedAt: string | null;
    };
  }
}
