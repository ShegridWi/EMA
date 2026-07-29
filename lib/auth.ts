import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import type { Role, City } from "@/app/generated/prisma/enums";

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  // Required by Auth.js when self-hosting behind a platform proxy
  // (DigitalOcean App Platform, see CLAUDE.md section 2).
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.active || user.deletedAt) {
          return null;
        }

        const isValid = await verifyPassword(password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          city: user.city,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.city = user.city;
      }
      return token;
    },
    session({ session, token }) {
      // `token` is typed as Record<string, unknown> upstream (see
      // types/next-auth.d.ts) — the shape is guaranteed by the jwt()
      // callback above, which always sets these three fields together.
      session.user.id = token.id as string;
      session.user.role = token.role as Role;
      session.user.city = token.city as City;
      return session;
    },
  },
  events: {
    // Business rule (01-business-rules.md #6): login must produce a
    // movement log entry. Runs after a successful authorize(), so it
    // never blocks or fails the sign-in itself.
    async signIn({ user }) {
      if (!user.id) return;
      await prisma.movementLog.create({
        data: {
          userId: user.id,
          action: "LOGIN",
          entityType: "User",
          entityId: user.id,
          metadata: {},
        },
      });
    },
  },
});
