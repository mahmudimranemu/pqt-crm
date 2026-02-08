import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "./prisma";
import { authConfig, type ExtendedUser } from "./auth.config";
import type { UserRole, Office } from "@prisma/client";

// Re-export types from auth.config
export type { ExtendedUser, ExtendedSession } from "./auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  // Override providers with the server-only authorize callback that uses Prisma
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
