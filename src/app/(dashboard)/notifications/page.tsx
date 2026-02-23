import { auth, type ExtendedSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NotificationList } from "./notification-list";

export default async function NotificationsPage() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) return null;

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <NotificationList
      notifications={notifications}
      unreadCount={unreadCount}
    />
  );
}
