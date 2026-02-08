import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "./prisma";
import type { UserRole, Office } from "@prisma/client";

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

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user) {
          throw new Error("Invalid email or password");
        }

        if (!user.isActive) {
          throw new Error("Your account has been deactivated");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.password,
        );

        if (!isPasswordValid) {
          throw new Error("Invalid email or password");
        }

        // Log the login
        await prisma.loginLog.create({
          data: {
            userId: user.id,
            loginTime: new Date(),
            ipAddress: "127.0.0.1",
          },
        });

        return {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          office: user.office,
        };
      },
    }),
  ],
  callbacks: {
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
});

// Helper function to check if user has required role
export function hasRole(
  userRole: UserRole,
  requiredRoles: UserRole[],
): boolean {
  return requiredRoles.includes(userRole);
}

// Helper function to check if user can access office data
export function canAccessOffice(
  userRole: UserRole,
  userOffice: Office,
  targetOffice: Office,
): boolean {
  if (userRole === "SUPER_ADMIN") return true;
  return userOffice === targetOffice;
}

// Role hierarchy for permission checks
export const roleHierarchy: Record<UserRole, number> = {
  SUPER_ADMIN: 5,
  ADMIN: 4,
  SALES_MANAGER: 3,
  SALES_AGENT: 2,
  VIEWER: 1,
};

export function hasMinimumRole(
  userRole: UserRole,
  minimumRole: UserRole,
): boolean {
  return roleHierarchy[userRole] >= roleHierarchy[minimumRole];
}
