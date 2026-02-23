"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, Mail, Smartphone, Volume2 } from "lucide-react";

interface NotificationSetting {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  enabled: boolean;
}

export function NotificationsTab() {
  const [settings, setSettings] = useState<NotificationSetting[]>([
    {
      id: "email",
      label: "Email Notifications",
      description:
        "Receive email notifications for new leads, deals, and task assignments.",
      icon: Mail,
      enabled: true,
    },
    {
      id: "push",
      label: "Push Notifications",
      description:
        "Get browser push notifications for urgent updates and reminders.",
      icon: Smartphone,
      enabled: false,
    },
    {
      id: "sound",
      label: "Notification Sounds",
      description: "Play a sound when you receive a new notification.",
      icon: Volume2,
      enabled: true,
    },
  ]);

  const toggleSetting = (id: string) => {
    setSettings((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
  };

  return (
    <Card className="border border-gray-200">
      <CardContent className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Notification Preferences
            </h2>
          </div>
          <Badge className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50">
            Coming Soon
          </Badge>
        </div>
        <p className="mb-6 text-sm text-gray-500">
          Choose how you want to be notified about activity in your CRM.
        </p>

        <div className="space-y-4">
          {settings.map((setting) => {
            const Icon = setting.icon;
            return (
              <div
                key={setting.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                    <Icon className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {setting.label}
                    </p>
                    <p className="text-sm text-gray-500">
                      {setting.description}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => toggleSetting(setting.id)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#dc2626] focus:ring-offset-2 ${
                    setting.enabled ? "bg-[#dc2626]" : "bg-gray-200"
                  }`}
                  role="switch"
                  aria-checked={setting.enabled}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      setting.enabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
