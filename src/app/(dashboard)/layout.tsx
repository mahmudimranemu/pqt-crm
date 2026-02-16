import { redirect } from "next/navigation";
import { auth, type ExtendedSession } from "@/lib/auth";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { getUnreadNotificationCount } from "@/lib/actions/notifications";

export default async function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = (await auth()) as ExtendedSession | null;

  if (!session?.user) {
    redirect("/login");
  }

  const unreadCount = await getUnreadNotificationCount();

  return (
    <DashboardLayout
      user={{
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        email: session.user.email,
        role: session.user.role,
        office: session.user.office,
      }}
      unreadNotifications={unreadCount}
    >
      {children}
    </DashboardLayout>
  );
}
