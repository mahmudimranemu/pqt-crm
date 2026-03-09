import { Suspense } from "react";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth, type ExtendedSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { toUserSlug } from "@/lib/utils";
import { getUserBySlug, getUserProfileStats } from "@/lib/actions/user-profile";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LayoutDashboard,
  Mail,
  Target,
  Users,
  MessageSquare,
  StickyNote,
  ArrowLeft,
} from "lucide-react";
import { ProfileHeader } from "./profile-header";
import { DashboardTab } from "./dashboard-tab";
import { EnquiriesTab } from "./enquiries-tab";
import { LeadsTab } from "./leads-tab";
import { ClientsTab } from "./clients-tab";
import { ChatTab } from "./chat-tab";
import { NotesTab } from "./notes-tab";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string; page?: string }>;
}

export default async function UserProfilePage({
  params,
  searchParams,
}: PageProps) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) redirect("/login");

  const { slug } = await params;
  const { tab, page } = await searchParams;

  let profileUser;
  try {
    profileUser = await getUserBySlug(slug);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "";
    if (message === "Access denied") {
      redirect("/dashboard");
    }
    notFound();
  }

  const isSuperAdmin = session.user.role === "SUPER_ADMIN";
  const isAdmin = ["SUPER_ADMIN", "ADMIN"].includes(session.user.role);
  const isSelf = session.user.id === profileUser.id;

  // Define available tabs based on viewer's relationship to this profile
  const tabs = [];
  if (isSuperAdmin) {
    tabs.push({ key: "dashboard", label: "Dashboard", icon: LayoutDashboard });
  }
  if (isSuperAdmin || isSelf) {
    tabs.push({ key: "enquiries", label: "Enquiries", icon: Mail });
    tabs.push({ key: "leads", label: "Leads", icon: Target });
    tabs.push({ key: "clients", label: "Clients", icon: Users });
  }
  tabs.push({ key: "chat", label: "Chat", icon: MessageSquare });
  if (isSuperAdmin) {
    tabs.push({ key: "notes", label: "Notes", icon: StickyNote });
  }

  // Default tab
  const defaultTab = isSuperAdmin ? "dashboard" : (isSelf ? "enquiries" : "chat");
  const activeTab = tab || defaultTab;

  // Fetch stats for dashboard tab
  let stats = null;
  if (isSuperAdmin) {
    try {
      stats = await getUserProfileStats(profileUser.id);
    } catch {
      // Stats may fail
    }
  }

  // Get super admin info for "Chat with Super Admin" button (for non-super-admin users viewing their own profile)
  let superAdminChatLink: string | null = null;
  if (!isSuperAdmin && isSelf) {
    const superAdmin = await prisma.user.findFirst({
      where: { role: "SUPER_ADMIN", isActive: true },
      select: { firstName: true, lastName: true },
    });
    if (superAdmin) {
      superAdminChatLink = `/users/${toUserSlug(superAdmin.firstName, superAdmin.lastName)}?tab=chat`;
    }
  }

  const currentPage = page ? parseInt(page) : 1;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link
        href={isAdmin ? "/settings/users" : "/dashboard"}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {isAdmin ? "Back to Users" : "Back to Dashboard"}
      </Link>

      {/* Profile Header */}
      <ProfileHeader
        user={{
          ...profileUser,
          createdAt: profileUser.createdAt.toISOString(),
          lastSeen: profileUser.lastSeen?.toISOString() || null,
        }}
        isSuperAdmin={isSuperAdmin}
        isSelf={isSelf}
        stats={stats}
        superAdminChatLink={superAdminChatLink}
      />

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 border-b border-gray-200 overflow-x-auto">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/users/${slug}${t.key === defaultTab ? "" : `?tab=${t.key}`}`}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === t.key
                ? "border-b-2 border-[#dc2626] text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </Link>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "dashboard" && isSuperAdmin && stats && (
        <DashboardTab stats={stats} />
      )}

      {activeTab === "enquiries" && (isSuperAdmin || isSelf) && (
        <Suspense fallback={<TabSkeleton />}>
          <EnquiriesTab userId={profileUser.id} page={currentPage} slug={slug} />
        </Suspense>
      )}

      {activeTab === "leads" && (isSuperAdmin || isSelf) && (
        <Suspense fallback={<TabSkeleton />}>
          <LeadsTab userId={profileUser.id} page={currentPage} slug={slug} />
        </Suspense>
      )}

      {activeTab === "clients" && (isSuperAdmin || isSelf) && (
        <Suspense fallback={<TabSkeleton />}>
          <ClientsTab userId={profileUser.id} page={currentPage} slug={slug} />
        </Suspense>
      )}

      {activeTab === "chat" && (
        <ChatTab
          otherUserId={profileUser.id}
          otherUserName={`${profileUser.firstName} ${profileUser.lastName}`}
          currentUserId={session.user.id}
        />
      )}

      {activeTab === "notes" && isSuperAdmin && (
        <NotesTab userId={profileUser.id} />
      )}
    </div>
  );
}

function TabSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}
