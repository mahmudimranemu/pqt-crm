import { redirect } from "next/navigation";
import { auth, type ExtendedSession } from "@/lib/auth";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { getUnreadNotificationCount } from "@/lib/actions/notifications";
import prisma from "@/lib/prisma";

export default async function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = (await auth()) as ExtendedSession | null;

  if (!session?.user) {
    redirect("/login");
  }

  // Fetch fresh user data from DB so sidebar/topbar stays in sync after profile changes
  // Also update lastSeen timestamp for online status tracking
  const [dbUser] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { firstName: true, lastName: true, email: true },
    }),
    prisma.user.update({
      where: { id: session.user.id },
      data: { lastSeen: new Date() },
    }).catch(() => {}),
  ]);

  const unreadCount = await getUnreadNotificationCount();

  return (
    <DashboardLayout
      user={{
        firstName: dbUser?.firstName ?? session.user.firstName,
        lastName: dbUser?.lastName ?? session.user.lastName,
        email: dbUser?.email ?? session.user.email,
        role: session.user.role,
        office: session.user.office,
      }}
      unreadNotifications={unreadCount}
    >
      {children}
    </DashboardLayout>
  );
}
