"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Bell,
  CheckSquare,
  Target,
  Handshake,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  CheckCheck,
  Mail,
} from "lucide-react";
import { markAsRead, markAllAsRead } from "@/lib/actions/notifications";
import Link from "next/link";

const typeIcons: Record<string, React.ElementType> = {
  TASK_ASSIGNED: CheckSquare,
  TASK_DUE: AlertTriangle,
  LEAD_ASSIGNED: Target,
  DEAL_STAGE_CHANGED: Handshake,
  PAYMENT_RECEIVED: DollarSign,
  COMMISSION_APPROVED: CheckCircle,
  SYSTEM_ALERT: Bell,
  MENTION: Bell,
  EMAIL_CHANGE_REQUEST: Mail,
  EMAIL_CHANGED: Mail,
};

const typeColors: Record<string, string> = {
  TASK_ASSIGNED: "text-purple-600 bg-purple-50",
  TASK_DUE: "text-orange-600 bg-orange-50",
  LEAD_ASSIGNED: "text-[#dc2626] bg-red-50",
  DEAL_STAGE_CHANGED: "text-blue-600 bg-blue-50",
  PAYMENT_RECEIVED: "text-emerald-600 bg-emerald-50",
  COMMISSION_APPROVED: "text-amber-600 bg-amber-50",
  SYSTEM_ALERT: "text-gray-600 bg-gray-100",
  MENTION: "text-indigo-600 bg-indigo-50",
  EMAIL_CHANGE_REQUEST: "text-orange-600 bg-orange-50",
  EMAIL_CHANGED: "text-emerald-600 bg-emerald-50",
};

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  isRead: boolean;
  link: string | null;
  createdAt: Date;
}

function timeAgo(date: Date): string {
  const now = new Date();
  const seconds = Math.floor(
    (now.getTime() - new Date(date).getTime()) / 1000
  );

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  return new Date(date).toLocaleDateString();
}

export function NotificationList({
  notifications: initialNotifications,
  unreadCount: initialUnreadCount,
}: {
  notifications: Notification[];
  unreadCount: number;
}) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleMarkAllRead = () => {
    startTransition(async () => {
      await markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      router.refresh();
    });
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      startTransition(async () => {
        await markAsRead(notification.id);
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, isRead: true } : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
        router.refresh();
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
            <Bell className="h-5 w-5 text-[#dc2626]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            <p className="text-sm text-gray-500">
              {unreadCount > 0
                ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
                : "All caught up!"}
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={isPending}
            className="gap-2"
          >
            <CheckCheck className="h-4 w-4" />
            Mark All as Read
          </Button>
        )}
      </div>

      {/* Notification List */}
      <div className="space-y-2">
        {notifications.length === 0 ? (
          <Card className="border border-gray-200">
            <CardContent className="py-16 text-center">
              <Bell className="mx-auto mb-4 h-12 w-12 text-gray-300" />
              <p className="text-gray-500 font-medium">No notifications yet</p>
              <p className="mt-1 text-sm text-gray-400">
                You&apos;ll see notifications here when there&apos;s activity
              </p>
            </CardContent>
          </Card>
        ) : (
          notifications.map((notification) => {
            const Icon = typeIcons[notification.type] || Bell;
            const colors = typeColors[notification.type] || "text-gray-500 bg-gray-100";
            const [iconColor, iconBg] = colors.split(" ");

            const card = (
              <Card
                key={notification.id}
                className={`border cursor-pointer transition-all hover:shadow-sm ${
                  notification.isRead
                    ? "border-gray-200 bg-white"
                    : "border-blue-200 bg-blue-50/30"
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <CardContent className="flex items-start gap-4 p-4">
                  <div
                    className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${iconBg}`}
                  >
                    <Icon className={`h-4 w-4 ${iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p
                        className={`text-sm ${
                          !notification.isRead
                            ? "font-semibold text-gray-900"
                            : "font-medium text-gray-700"
                        }`}
                      >
                        {notification.title}
                      </p>
                      {!notification.isRead && (
                        <Badge className="bg-[#dc2626] text-white text-[10px] px-1.5">
                          New
                        </Badge>
                      )}
                    </div>
                    {notification.message && (
                      <p className="mt-0.5 text-sm text-gray-500">
                        {notification.message}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-gray-400">
                      {timeAgo(notification.createdAt)}
                    </p>
                  </div>
                  {!notification.isRead && (
                    <span className="mt-2 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-[#dc2626]" />
                  )}
                </CardContent>
              </Card>
            );

            if (notification.link) {
              return (
                <Link
                  key={notification.id}
                  href={notification.link}
                  onClick={() => handleNotificationClick(notification)}
                >
                  {card}
                </Link>
              );
            }

            return <div key={notification.id}>{card}</div>;
          })
        )}
      </div>
    </div>
  );
}
