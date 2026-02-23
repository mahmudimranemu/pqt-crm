import { auth, type ExtendedSession } from "@/lib/auth";
import { getUserById } from "@/lib/actions/users";
import { Card, CardContent } from "@/components/ui/card";
import { Settings, User, Bell, Palette, Shield, Globe } from "lucide-react";
import { ProfileForm } from "./profile-form";
import { NotificationsTab } from "./notifications-tab";
import { AppearanceTab } from "./appearance-tab";
import { SecurityTab } from "./security-tab";
import { PreferencesTab } from "./preferences-tab";
import Link from "next/link";

const settingsTabs = [
  { key: "profile", label: "Profile", icon: User, href: "/settings/profile" },
  {
    key: "notifications",
    label: "Notifications",
    icon: Bell,
    href: "/settings/profile?tab=notifications",
  },
  {
    key: "appearance",
    label: "Appearance",
    icon: Palette,
    href: "/settings/profile?tab=appearance",
  },
  {
    key: "security",
    label: "Security",
    icon: Shield,
    href: "/settings/profile?tab=security",
  },
  {
    key: "preferences",
    label: "Preferences",
    icon: Globe,
    href: "/settings/profile?tab=preferences",
  },
];

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function ProfilePage({ searchParams }: PageProps) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) return null;

  const user = await getUserById(session.user.id);
  const params = await searchParams;
  const activeTab = params.tab || "profile";

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
          <Settings className="h-5 w-5 text-gray-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500">Manage your account and preferences</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        {settingsTabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab.key === activeTab
                ? "border-b-2 border-[#dc2626] text-[#dc2626]"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "profile" && (
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <h2 className="mb-6 text-lg font-semibold text-gray-900">
              Profile Settings
            </h2>
            <ProfileForm
              userId={user.id}
              initialData={{
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone || "",
                avatar: user.avatar || "",
              }}
            />
          </CardContent>
        </Card>
      )}

      {activeTab === "notifications" && <NotificationsTab />}
      {activeTab === "appearance" && <AppearanceTab />}
      {activeTab === "security" && <SecurityTab />}
      {activeTab === "preferences" && <PreferencesTab />}
    </div>
  );
}
