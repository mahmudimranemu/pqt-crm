"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Bell,
  CheckSquare,
  Target,
  Handshake,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Loader2,
  CheckCheck,
  MessageSquare,
  StickyNote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getLatestNotifications,
  markAsRead,
  markAllAsRead,
} from "@/lib/actions/notifications";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Notification = Awaited<ReturnType<typeof getLatestNotifications>>[number];

const typeIcons: Record<string, React.ElementType> = {
  TASK_ASSIGNED: CheckSquare,
  TASK_DUE: AlertTriangle,
  LEAD_ASSIGNED: Target,
  DEAL_STAGE_CHANGED: Handshake,
  PAYMENT_RECEIVED: DollarSign,
  COMMISSION_APPROVED: CheckCircle,
  SYSTEM_ALERT: Bell,
  MENTION: Bell,
  CHAT_MESSAGE: MessageSquare,
  ADMIN_NOTE: StickyNote,
};

const typeColors: Record<string, string> = {
  TASK_ASSIGNED: "text-purple-600",
  TASK_DUE: "text-orange-600",
  LEAD_ASSIGNED: "text-[#dc2626]",
  DEAL_STAGE_CHANGED: "text-blue-600",
  PAYMENT_RECEIVED: "text-emerald-600",
  COMMISSION_APPROVED: "text-amber-600",
  SYSTEM_ALERT: "text-gray-600",
  MENTION: "text-indigo-600",
  CHAT_MESSAGE: "text-blue-600",
  ADMIN_NOTE: "text-amber-600",
};

function timeAgo(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(date).toLocaleDateString();
}

interface NotificationDropdownProps {
  unreadCount: number;
}

export function NotificationDropdown({
  unreadCount: initialUnreadCount,
}: NotificationDropdownProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Sync prop changes
  useEffect(() => {
    setUnreadCount(initialUnreadCount);
  }, [initialUnreadCount]);

  // Fetch latest notifications when dropdown opens
  useEffect(() => {
    if (open) {
      setLoading(true);
      getLatestNotifications(5)
        .then((data) => {
          setNotifications(data);
        })
        .catch(() => setNotifications([]))
        .finally(() => setLoading(false));
    }
  }, [open]);

  const handleMarkAllRead = () => {
    startTransition(async () => {
      await markAllAsRead();
      setUnreadCount(0);
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true }))
      );
      router.refresh();
    });
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      startTransition(async () => {
        await markAsRead(notification.id);
        setUnreadCount((prev) => Math.max(0, prev - 1));
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, isRead: true } : n
          )
        );
        router.refresh();
      });
    }
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-gray-500" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#dc2626] text-[10px] text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-900">
            Notifications
          </span>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={isPending}
              className="flex items-center gap-1 text-xs font-normal text-[#dc2626] hover:text-[#b91c1c] disabled:opacity-50"
            >
              <CheckCheck className="h-3 w-3" />
              Mark all read
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-8 text-center">
            <Bell className="mx-auto mb-2 h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-500">No notifications yet</p>
            <p className="text-xs text-gray-400">You&apos;re all caught up!</p>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {notifications.map((notification) => {
              const Icon = typeIcons[notification.type] || Bell;
              const iconColor =
                typeColors[notification.type] || "text-gray-500";

              const content = (
                <div
                  className={`flex items-start gap-3 px-3 py-2.5 transition-colors hover:bg-gray-50 cursor-pointer ${
                    !notification.isRead ? "bg-blue-50/40" : ""
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="mt-0.5 flex-shrink-0">
                    <Icon className={`h-4 w-4 ${iconColor}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p
                        className={`text-sm truncate ${
                          !notification.isRead
                            ? "font-semibold text-gray-900"
                            : "font-medium text-gray-700"
                        }`}
                      >
                        {notification.title}
                      </p>
                      {!notification.isRead && (
                        <span className="h-2 w-2 flex-shrink-0 rounded-full bg-[#dc2626]" />
                      )}
                    </div>
                    {notification.message && (
                      <p className="mt-0.5 text-xs text-gray-500 truncate">
                        {notification.message}
                      </p>
                    )}
                    <p className="mt-0.5 text-[11px] text-gray-400">
                      {timeAgo(notification.createdAt)}
                    </p>
                  </div>
                </div>
              );

              if (notification.link) {
                return (
                  <Link
                    key={notification.id}
                    href={notification.link}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    {content}
                  </Link>
                );
              }

              return <div key={notification.id}>{content}</div>;
            })}
          </div>
        )}

        <DropdownMenuSeparator />
        <div className="px-2 py-2">
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block w-full rounded-md bg-gray-50 px-3 py-2 text-center text-xs font-medium text-gray-700 hover:bg-gray-100"
          >
            See All Notifications
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
