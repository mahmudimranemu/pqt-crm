import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "./prisma";
import { authConfig, type ExtendedUser } from "./auth.config";
import type { UserRole, Office } from "@prisma/client";

class AccountDeactivatedError extends CredentialsSignin {
  code = "ACCOUNT_DEACTIVATED";
}

class AccountLockedError extends CredentialsSignin {
  code: string;
  constructor(minutes: number) {
    super();
    this.code = `ACCOUNT_LOCKED_${minutes}`;
  }
}

class TooManyAttemptsError extends CredentialsSignin {
  code = "TOO_MANY_ATTEMPTS";
}

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
          throw new AccountDeactivatedError();
        }

        // Check account lockout
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          const minutesLeft = Math.ceil(
            (user.lockedUntil.getTime() - Date.now()) / 60000,
          );
          throw new AccountLockedError(minutesLeft);
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.password,
        );

        if (!isPasswordValid) {
          // Increment failed attempts
          const failedAttempts = user.failedLoginAttempts + 1;
          const lockout =
            failedAttempts >= 5
              ? { lockedUntil: new Date(Date.now() + 30 * 60 * 1000) }
              : {};

          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: failedAttempts,
              ...lockout,
            },
          });

          if (failedAttempts >= 5) {
            throw new TooManyAttemptsError();
          }

          throw new Error("Invalid email or password");
        }

        // Reset failed attempts on successful login
        if (user.failedLoginAttempts > 0 || user.lockedUntil) {
          await prisma.user.update({
            where: { id: user.id },
            data: { failedLoginAttempts: 0, lockedUntil: null },
          });
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
