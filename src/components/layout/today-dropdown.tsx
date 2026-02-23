"use client";

import { useEffect, useState } from "react";
import {
  Calendar,
  ChevronDown,
  Clock,
  CheckSquare,
  Users,
  Home,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { getTodayAgenda } from "@/lib/actions/tasks";
import Link from "next/link";

const priorityColors: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-700",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
};

type AgendaData = Awaited<ReturnType<typeof getTodayAgenda>>;

export function TodayDropdown() {
  const [data, setData] = useState<AgendaData | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open && !data) {
      setLoading(true);
      getTodayAgenda()
        .then(setData)
        .catch(() => setData(null))
        .finally(() => setLoading(false));
    }
  }, [open, data]);

  const today = new Date();
  const formattedDate = today.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const totalItems = data
    ? data.tasks.length + data.bookings.length
    : 0;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 text-gray-600">
          <Calendar className="h-4 w-4" />
          Today
          {data && totalItems > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#dc2626] px-1 text-[10px] font-medium text-white">
              {totalItems}
            </span>
          )}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-900">
            Today&apos;s Agenda
          </span>
          <span className="text-xs font-normal text-gray-500">
            {formattedDate}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : !data ? (
          <div className="py-6 text-center text-sm text-gray-500">
            Failed to load agenda
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {/* Overdue Alert */}
            {data.overdueTasks > 0 && (
              <Link href="/tasks" onClick={() => setOpen(false)}>
                <div className="mx-2 mb-2 flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span>
                    {data.overdueTasks} overdue task{data.overdueTasks > 1 ? "s" : ""}
                  </span>
                </div>
              </Link>
            )}

            {/* Tasks Section */}
            {data.tasks.length > 0 && (
              <div className="px-2 py-1">
                <p className="mb-1 flex items-center gap-1.5 px-2 text-xs font-medium uppercase text-gray-400">
                  <CheckSquare className="h-3 w-3" />
                  Tasks Due Today
                </p>
                {data.tasks.map((task) => (
                  <Link
                    key={task.id}
                    href="/tasks"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-gray-50"
                  >
                    <Clock className="h-4 w-4 flex-shrink-0 text-gray-400" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {task.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {task.assignee.firstName} {task.assignee.lastName}
                      </p>
                    </div>
                    <Badge className={`text-[10px] ${priorityColors[task.priority]}`}>
                      {task.priority}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}

            {data.tasks.length > 0 && data.bookings.length > 0 && (
              <DropdownMenuSeparator />
            )}

            {/* Bookings Section */}
            {data.bookings.length > 0 && (
              <div className="px-2 py-1">
                <p className="mb-1 flex items-center gap-1.5 px-2 text-xs font-medium uppercase text-gray-400">
                  <Users className="h-3 w-3" />
                  Bookings Today
                </p>
                {data.bookings.map((booking) => (
                  <Link
                    key={booking.id}
                    href="/bookings"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-gray-50"
                  >
                    <Home className="h-4 w-4 flex-shrink-0 text-gray-400" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {booking.client.firstName} {booking.client.lastName}
                      </p>
                      <p className="truncate text-xs text-gray-500">
                        {booking.property.name}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(booking.bookingDate).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </Link>
                ))}
              </div>
            )}

            {/* Empty State */}
            {data.tasks.length === 0 && data.bookings.length === 0 && data.overdueTasks === 0 && (
              <div className="py-6 text-center">
                <Calendar className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                <p className="text-sm text-gray-500">No agenda for today</p>
                <p className="text-xs text-gray-400">Enjoy your free day!</p>
              </div>
            )}

            {/* Footer Links */}
            <DropdownMenuSeparator />
            <div className="flex gap-2 px-2 py-2">
              <Link
                href="/tasks"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-md bg-gray-50 px-3 py-1.5 text-center text-xs font-medium text-gray-700 hover:bg-gray-100"
              >
                All Tasks
              </Link>
              <Link
                href="/bookings"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-md bg-gray-50 px-3 py-1.5 text-center text-xs font-medium text-gray-700 hover:bg-gray-100"
              >
                All Bookings
              </Link>
            </div>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
