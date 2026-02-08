import type { NextAuthConfig } from "next-auth";
import type { UserRole, Office } from "@prisma/client";
import Credentials from "next-auth/providers/credentials";

// Extended types for our app
export interface ExtendedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  office: Office;
}

export interface ExtendedSession {
  user: ExtendedUser;
  expires: string;
}

// Edge-compatible auth config (no Prisma/Node.js-only imports)
// The authorize() callback is added in auth.ts which only runs on the server
export const authConfig = {
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      // authorize is defined in auth.ts (server-only)
      authorize: () => null,
    }),
  ],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard") ||
        nextUrl.pathname.startsWith("/clients") ||
        nextUrl.pathname.startsWith("/properties") ||
        nextUrl.pathname.startsWith("/enquiries") ||
        nextUrl.pathname.startsWith("/bookings") ||
        nextUrl.pathname.startsWith("/sales") ||
        nextUrl.pathname.startsWith("/citizenship") ||
        nextUrl.pathname.startsWith("/calendar") ||
        nextUrl.pathname.startsWith("/reports") ||
        nextUrl.pathname.startsWith("/settings");
      const isOnLogin = nextUrl.pathname === "/login";

      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false; // Redirect to login
      }

      if (isOnLogin && isLoggedIn) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.email = user.email as string;
        token.firstName = (user as ExtendedUser).firstName;
        token.lastName = (user as ExtendedUser).lastName;
        token.role = (user as ExtendedUser).role;
        token.office = (user as ExtendedUser).office;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session as unknown as ExtendedSession).user = {
          id: token.id as string,
          email: token.email as string,
          firstName: token.firstName as string,
          lastName: token.lastName as string,
          role: token.role as UserRole,
          office: token.office as Office,
        };
      }
      return session as unknown as ExtendedSession;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  trustHost: true,
} satisfies NextAuthConfig;
