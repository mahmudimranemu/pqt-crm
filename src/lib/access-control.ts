import { redirect } from "next/navigation";
import {
  auth,
  hasMinimumRole,
  canAccessOffice,
  type ExtendedSession,
} from "./auth";
import type { UserRole, Office } from "@prisma/client";

/**
 * Requires user to be authenticated. Redirects to login if not.
 * Returns the session if authenticated.
 */
export async function requireAuth(): Promise<ExtendedSession> {
  const session = (await auth()) as ExtendedSession | null;

  if (!session?.user) {
    redirect("/login");
  }

  return session;
}

/**
 * Requires user to have at least the specified role.
 * Redirects to dashboard with error if insufficient permissions.
 */
export async function requireRole(
  minimumRole: UserRole,
): Promise<ExtendedSession> {
  const session = await requireAuth();

  if (!hasMinimumRole(session.user.role, minimumRole)) {
    redirect("/dashboard?error=insufficient_permissions");
  }

  return session;
}

/**
 * Requires user to have one of the specified roles.
 * Redirects to dashboard with error if insufficient permissions.
 */
export async function requireRoles(
  allowedRoles: UserRole[],
): Promise<ExtendedSession> {
  const session = await requireAuth();

  if (
    !allowedRoles.includes(session.user.role) &&
    session.user.role !== "SUPER_ADMIN"
  ) {
    redirect("/dashboard?error=insufficient_permissions");
  }

  return session;
}

/**
 * Checks if user can access data from a specific office.
 * Returns true if user has access, false otherwise.
 */
export async function checkOfficeAccess(
  targetOffice: Office,
): Promise<boolean> {
  const session = (await auth()) as ExtendedSession | null;

  if (!session?.user) {
    return false;
  }

  return canAccessOffice(session.user.role, session.user.office, targetOffice);
}

/**
 * Filters data based on user's office access.
 * Super admins see all data, others see only their office's data.
 */
export function getOfficeFilter(userRole: UserRole, userOffice: Office) {
  if (userRole === "SUPER_ADMIN") {
    return {};
  }

  return { office: userOffice };
}

/**
 * Gets the agent filter for data queries.
 * Super admins and managers can see all data in their office.
 * Agents can only see their own data.
 */
export function getAgentFilter(userId: string, userRole: UserRole) {
  if (
    userRole === "SUPER_ADMIN" ||
    userRole === "ADMIN" ||
    userRole === "SALES_MANAGER"
  ) {
    return {};
  }

  return { assignedAgentId: userId };
}

/**
 * Combines office and agent filters for queries.
 */
export function getDataAccessFilter(
  userId: string,
  userRole: UserRole,
  userOffice: Office,
) {
  return {
    ...getOfficeFilter(userRole, userOffice),
    ...getAgentFilter(userId, userRole),
  };
}

/**
 * Role display names for UI
 */
export const roleDisplayNames: Record<UserRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  SALES_MANAGER: "Senior Consultant",
  SALES_AGENT: "Consultant",
  VIEWER: "Junior Consultant",
};

/**
 * Office display names for UI
 */
export const officeDisplayNames: Record<Office, string> = {
  UAE: "UAE Office",
  TURKEY: "Turkey Office",
  UK: "UK Office",
  MALAYSIA: "Malaysia Office",
  BANGLADESH: "Bangladesh Office",
  HEAD_OFFICE: "Head Office",
};

/**
 * Check if user can perform write operations
 */
export function canWrite(role: UserRole): boolean {
  return role !== "VIEWER";
}

/**
 * Check if user can delete records
 */
export function canDelete(role: UserRole): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN";
}

/**
 * Check if user can manage users
 */
export function canManageUsers(role: UserRole): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN";
}
