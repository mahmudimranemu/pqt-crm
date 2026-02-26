import { Suspense } from "react";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth, type ExtendedSession } from "@/lib/auth";
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
  const isSelf = session.user.id === profileUser.id;

  // Determine active tab
  const activeTab = tab || (isSuperAdmin ? "dashboard" : "enquiries");

  // Define available tabs based on role
  const tabs = [
    ...(isSuperAdmin
      ? [{ key: "dashboard", label: "Dashboard", icon: LayoutDashboard }]
      : []),
    { key: "enquiries", label: "Enquiries", icon: Mail },
    { key: "leads", label: "Leads", icon: Target },
    { key: "clients", label: "Clients", icon: Users },
    { key: "chat", label: "Chat", icon: MessageSquare },
    ...(isSuperAdmin
      ? [{ key: "notes", label: "Notes", icon: StickyNote }]
      : []),
  ];

  // Fetch stats for dashboard tab
  let stats = null;
  if (isSuperAdmin) {
    try {
      stats = await getUserProfileStats(profileUser.id);
    } catch {
      // Stats may fail
    }
  }

  const currentPage = page ? parseInt(page) : 1;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link
        href="/settings/users"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Users
      </Link>

      {/* Profile Header */}
      <ProfileHeader
        user={{
          ...profileUser,
          createdAt: profileUser.createdAt.toISOString(),
          lastSeen: profileUser.lastSeen?.toISOString() || null,
        }}
        isSuperAdmin={isSuperAdmin}
        stats={stats}
      />

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 border-b border-gray-200 overflow-x-auto">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/users/${slug}${t.key === (isSuperAdmin ? "dashboard" : "enquiries") ? "" : `?tab=${t.key}`}`}
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

      {activeTab === "enquiries" && (
        <Suspense fallback={<TabSkeleton />}>
          <EnquiriesTab userId={profileUser.id} page={currentPage} slug={slug} />
        </Suspense>
      )}

      {activeTab === "leads" && (
        <Suspense fallback={<TabSkeleton />}>
          <LeadsTab userId={profileUser.id} page={currentPage} slug={slug} />
        </Suspense>
      )}

      {activeTab === "clients" && (
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
