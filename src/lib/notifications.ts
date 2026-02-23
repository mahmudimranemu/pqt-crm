import prisma from "@/lib/prisma";
import type { NotificationType } from "@prisma/client";

/**
 * Create a notification for a specific user.
 * Non-blocking — failures are caught and logged.
 */
export async function notify(
  userId: string,
  type: NotificationType | string,
  title: string,
  message: string,
  link?: string,
): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        type: type as NotificationType,
        title,
        message,
        link,
        userId,
      },
    });
  } catch (error) {
    console.error("[NOTIFY] Failed to create notification:", error);
  }
}

/**
 * Send a notification to all SUPER_ADMINs.
 */
export async function notifySuperAdmins(
  type: NotificationType | string,
  title: string,
  message: string,
  link?: string,
): Promise<void> {
  try {
    const admins = await prisma.user.findMany({
      where: { role: "SUPER_ADMIN", isActive: true },
      select: { id: true },
    });

    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map((admin) => ({
          type: type as NotificationType,
          title,
          message,
          link,
          userId: admin.id,
        })),
      });
    }
  } catch (error) {
    console.error("[NOTIFY] Failed to notify super admins:", error);
  }
}

/**
 * Send notification to a specific user AND all SUPER_ADMINs.
 * Avoids duplicates if the user IS a super admin.
 */
export async function notifyUserAndAdmins(
  userId: string,
  type: NotificationType | string,
  title: string,
  message: string,
  link?: string,
): Promise<void> {
  try {
    const admins = await prisma.user.findMany({
      where: { role: "SUPER_ADMIN", isActive: true },
      select: { id: true },
    });

    const recipientIds = new Set<string>();
    recipientIds.add(userId);
    for (const admin of admins) {
      recipientIds.add(admin.id);
    }

    if (recipientIds.size > 0) {
      await prisma.notification.createMany({
        data: Array.from(recipientIds).map((uid) => ({
          type: type as NotificationType,
          title,
          message,
          link,
          userId: uid,
        })),
      });
    }
  } catch (error) {
    console.error("[NOTIFY] Failed to notify user and admins:", error);
  }
}
