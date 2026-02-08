import { auth, type ExtendedSession } from "@/lib/auth";
import { getUserById } from "@/lib/actions/users";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, User, Bell, Palette, Shield, Globe } from "lucide-react";
import { ProfileForm } from "./profile-form";
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

export default async function ProfilePage() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) return null;

  const user = await getUserById(session.user.id);

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
              tab.key === "profile"
                ? "border-b-2 border-gray-900 text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Profile Settings */}
      <Card className="border border-gray-200">
        <CardContent className="p-6">
          <h2 className="mb-6 text-lg font-semibold text-gray-900">
            Profile Settings
          </h2>

          {/* Avatar Section */}
          <div className="mb-8 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-200 text-xl font-bold text-gray-500">
              {user.firstName[0]}
              {user.lastName[0]}
            </div>
            <div>
              <Button
                size="sm"
                className="bg-[#dc2626] hover:bg-[#b91c1c] text-white"
              >
                Change Avatar
              </Button>
              <p className="mt-1 text-xs text-gray-500">
                JPG, PNG or GIF. Max 2MB.
              </p>
            </div>
          </div>

          {/* Profile Fields */}
          <div className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">
                  First Name
                </label>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900">
                  {user.firstName}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Last Name
                </label>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900">
                  {user.lastName}
                </div>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Email
                </label>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900">
                  {user.email}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Phone
                </label>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900">
                  +1 (555) 123-4567
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Bio</label>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 min-h-[80px]">
                Senior Real Estate Consultant with 10+ years of experience.
              </div>
            </div>
          </div>

          {/* Hidden editable form for actual updates */}
          <div className="mt-6">
            <ProfileForm
              userId={user.id}
              initialData={{
                firstName: user.firstName,
                lastName: user.lastName,
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
