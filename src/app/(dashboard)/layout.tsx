import { redirect } from "next/navigation";
import { auth, type ExtendedSession } from "@/lib/auth";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

export default async function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = (await auth()) as ExtendedSession | null;

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <DashboardLayout
      user={{
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        email: session.user.email,
        role: session.user.role,
        office: session.user.office,
      }}
    >
      {children}
    </DashboardLayout>
  );
}
