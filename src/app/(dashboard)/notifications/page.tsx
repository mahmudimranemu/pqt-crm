import { auth, type ExtendedSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  CheckSquare,
  Target,
  Handshake,
  DollarSign,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

const typeIcons: Record<string, React.ElementType> = {
  TASK_ASSIGNED: CheckSquare,
  TASK_DUE: AlertTriangle,
  LEAD_ASSIGNED: Target,
  DEAL_STAGE_CHANGED: Handshake,
  PAYMENT_RECEIVED: DollarSign,
  COMMISSION_APPROVED: CheckCircle,
  SYSTEM_ALERT: Bell,
  MENTION: Bell,
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
};

export default async function NotificationsPage() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) return null;

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
          <Bell className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500">
            {unreadCount > 0 ? `${unreadCount} unread notifications` : "All caught up!"}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <Card className="border border-gray-200">
            <CardContent className="py-12 text-center">
              <Bell className="mx-auto mb-4 h-12 w-12 text-gray-300" />
              <p className="text-gray-500">No notifications yet.</p>
            </CardContent>
          </Card>
        ) : (
          notifications.map((notification) => {
            const Icon = typeIcons[notification.type] || Bell;
            const iconColor = typeColors[notification.type] || "text-gray-500";

            return (
              <Card
                key={notification.id}
                className={`border transition-colors ${
                  notification.isRead ? "border-gray-200 bg-white" : "border-blue-200 bg-blue-50/30"
                }`}
              >
                <CardContent className="flex items-start gap-4 p-4">
                  <div className="mt-0.5">
                    <Icon className={`h-5 w-5 ${iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                      {!notification.isRead && (
                        <Badge className="bg-blue-100 text-blue-700 text-[10px]">New</Badge>
                      )}
                    </div>
                    {notification.message && (
                      <p className="mt-0.5 text-sm text-gray-500">{notification.message}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-400">
                      {new Date(notification.createdAt).toLocaleString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
