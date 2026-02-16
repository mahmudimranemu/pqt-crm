import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@prisma/client";

/**
 * Create a notification for a user.
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
