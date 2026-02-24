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

  // Fetch fresh email from DB so topbar stays in sync after email changes
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true },
  });

  const unreadCount = await getUnreadNotificationCount();

  return (
    <DashboardLayout
      user={{
        firstName: session.user.firstName,
        lastName: session.user.lastName,
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
