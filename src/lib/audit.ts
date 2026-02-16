import { prisma } from "@/lib/prisma";
import { auth, type ExtendedSession } from "@/lib/auth";
import type { AuditAction, Prisma } from "@prisma/client";

/**
 * Log an audit entry. Non-blocking — failures are caught so they never
 * break the calling server action.
 */
export async function auditLog(
  action: AuditAction,
  entityType: string,
  entityId: string,
  changes?: Record<string, unknown> | null,
): Promise<void> {
  try {
    const session = (await auth()) as ExtendedSession | null;
    if (!session?.user?.id) return;

    await prisma.auditLog.create({
      data: {
        action,
        entityType,
        entityId,
        changes: (changes as Prisma.InputJsonValue) ?? undefined,
        userId: session.user.id,
      },
    });
  } catch (error) {
    // Audit logging should never break the main operation
    console.error("[AUDIT] Failed to write audit log:", error);
  }
}

/**
 * Variant that accepts an explicit userId (for cases where session
 * is already resolved or the action runs in a cron context).
 */
export async function auditLogWithUser(
  userId: string,
  action: AuditAction,
  entityType: string,
  entityId: string,
  changes?: Record<string, unknown> | null,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        entityType,
        entityId,
        changes: (changes as Prisma.InputJsonValue) ?? undefined,
        userId,
      },
    });
  } catch (error) {
    console.error("[AUDIT] Failed to write audit log:", error);
  }
}
