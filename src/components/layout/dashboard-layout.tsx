"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { cn } from "@/lib/utils";
import type { UserRole, Office } from "@prisma/client";

interface DashboardLayoutProps {
  children: React.ReactNode;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    role: UserRole;
    office: Office;
  };
  unreadNotifications?: number;
}

export function DashboardLayout({
  children,
  user,
  unreadNotifications = 0,
}: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        userRole={user.role}
        collapsed={sidebarCollapsed}
        onCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        user={{
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        }}
      />
      <div
        className={cn(
          "transition-all duration-300",
          sidebarCollapsed ? "lg:pl-16" : "lg:pl-60",
        )}
      >
        <Topbar user={user} unreadNotifications={unreadNotifications} />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
