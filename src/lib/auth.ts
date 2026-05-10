/**
 * Cookie-mode auth — server-only.
 *
 * The PMS issues a JWT in an HttpOnly cookie on the parent domain
 * `.propertyquestturkey.com`. CRM verifies it here and looks up the user
 * from its mirror table to build the same `ExtendedSession` shape the rest
 * of the app already consumes.
 *
 * IMPORTANT: this module imports `next/headers` and MUST NOT be pulled into
 * a client component. Client components needing sign-out should import from
 * `./auth-client` instead.
 */

import "server-only";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import prisma from "./prisma";
import type { UserRole, Office } from "@prisma/client";
import type { ExtendedSession, ExtendedUser } from "./auth.config";

export type { ExtendedUser, ExtendedSession } from "./auth.config";

const ACCESS_COOKIE = "pqt_access";

function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set — CRM cannot verify PMS tokens.");
  }
  return new TextEncoder().encode(secret);
}

type AccessClaims = {
  sub: string;
  email?: string;
  role?: string;
  type: "access";
  exp: number;
};

async function verifyAccessCookie(): Promise<AccessClaims | null> {
  const jar = await cookies();
  const token = jar.get(ACCESS_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      issuer: "pms.propertyquestturkey.com",
      audience: "crm",
    });
    if (payload.type !== "access" || !payload.sub) return null;
    return payload as unknown as AccessClaims;
  } catch {
    return null;
  }
}

/**
 * Drop-in replacement for the old NextAuth `auth()`. Returns the same
 * ExtendedSession shape consumers expect, or null when not authenticated.
 *
 * The CRM mirror is the source of `firstName`/`lastName`/`role`/`office` —
 * the PMS webhook (PR 3 + PR 4) keeps it in sync within ~1s.
 */
export async function auth(): Promise<ExtendedSession | null> {
  const claims = await verifyAccessCookie();
  if (!claims) return null;

  const dbUser = await prisma.user.findUnique({
    where: { id: claims.sub },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      office: true,
      isActive: true,
    },
  });
  if (!dbUser || !dbUser.isActive) return null;

  const extendedUser: ExtendedUser = {
    id: dbUser.id,
    email: dbUser.email,
    firstName: dbUser.firstName,
    lastName: dbUser.lastName,
    role: dbUser.role as UserRole,
    office: dbUser.office as Office,
  };

  return {
    user: extendedUser,
    expires: new Date(claims.exp * 1000).toISOString(),
  };
}

/** Re-exports from the client-safe twin so any callsite that already
 *  imports `signOut` / `signInUrl` from `@/lib/auth` (server context) keeps
 *  working. Client components should import from `./auth-client` directly. */
export { signOut, signInUrl } from "./auth-client";

// ---------------------------------------------------------------------------
// Role + office helpers — kept here so existing callsites in `access-control`
// and elsewhere don't have to be re-pointed.
// ---------------------------------------------------------------------------

const ROLE_RANK: Record<UserRole, number> = {
  SUPER_ADMIN: 100,
  ADMIN: 80,
  SALES_MANAGER: 60,
  SALES_AGENT: 40,
  VIEWER: 20,
};

/** True iff `userRole` is at least as privileged as `minimumRole`. */
export function hasMinimumRole(
  userRole: UserRole,
  minimumRole: UserRole,
): boolean {
  return (ROLE_RANK[userRole] ?? 0) >= (ROLE_RANK[minimumRole] ?? 0);
}

/** True iff a user with the given role + office is allowed to read/operate
 *  on data belonging to `targetOffice`. SUPER_ADMINs see everything; everyone
 *  else is scoped to their own office. */
export function canAccessOffice(
  userRole: UserRole,
  userOffice: Office,
  targetOffice: Office,
): boolean {
  if (userRole === "SUPER_ADMIN") return true;
  return userOffice === targetOffice;
}
