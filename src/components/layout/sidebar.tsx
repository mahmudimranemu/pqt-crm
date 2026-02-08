"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Building2,
  Mail,
  BarChart3,
  Shield,
  Settings,
  Bell,
  ChevronLeft,
  Plus,
  LogOut,
} from "lucide-react";
import type { UserRole } from "@prisma/client";

interface SidebarProps {
  userRole: UserRole;
  collapsed: boolean;
  onCollapse: () => void;
  user: {
    firstName: string;
    lastName: string;
    role: UserRole;
  };
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  roles?: UserRole[];
}

const navigation: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Leads",
    href: "/clients",
    icon: Users,
  },
  {
    title: "Properties",
    href: "/properties",
    icon: Building2,
  },
  {
    title: "Enquiries",
    href: "/clients/enquiries",
    icon: Mail,
  },
  {
    title: "Analytics",
    href: "/kpis",
    icon: BarChart3,
  },
  {
    title: "Admin Panel",
    href: "/settings/users",
    icon: Shield,
    roles: ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"],
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

const roleNames: Record<UserRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  SALES_MANAGER: "Sales Manager",
  SALES_AGENT: "Sales Agent",
  VIEWER: "Viewer",
};

export function Sidebar({
  userRole,
  collapsed,
  onCollapse,
  user,
}: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col bg-[#dc2626] transition-all duration-300",
        collapsed ? "w-16" : "w-56",
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-4">
        <Link href="/dashboard" className="flex items-center gap-2 text-white">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <span className="text-lg font-bold tracking-tight">
              PropertyFlow
            </span>
          )}
        </Link>
      </div>

      {/* Add Lead Button */}
      <div className="px-3 pb-2">
        <Link
          href="/clients/create"
          className={cn(
            "flex items-center gap-2 rounded-lg bg-white/20 px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/30",
            collapsed && "justify-center px-0",
          )}
        >
          <Plus className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Add Lead</span>}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        {navigation.map((item) => {
          if (
            item.roles &&
            !item.roles.includes(userRole) &&
            userRole !== "SUPER_ADMIN"
          ) {
            return null;
          }

          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.title}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-white text-[#dc2626]"
                  : "text-white/90 hover:bg-white/15 hover:text-white",
                collapsed && "justify-center px-0",
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.title}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="mt-auto border-t border-white/20 px-3 py-3 space-y-2">
        {/* Notifications */}
        <Link
          href="/notifications"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/90 transition-colors hover:bg-white/15",
            collapsed && "justify-center px-0",
          )}
        >
          <div className="relative">
            <Bell className="h-5 w-5 shrink-0" />
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[9px] font-bold text-[#dc2626]">
              3
            </span>
          </div>
          {!collapsed && <span>Notifications</span>}
        </Link>

        {/* User Profile */}
        <div
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5",
            collapsed && "justify-center px-0",
          )}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-medium text-white">
            {user.firstName[0]}
            {user.lastName[0]}
          </div>
          {!collapsed && (
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-white">
                {user.firstName} {user.lastName}
              </p>
              <p className="truncate text-xs text-white/70">
                {roleNames[user.role]}
              </p>
            </div>
          )}
          {!collapsed && (
            <LogOut className="h-4 w-4 shrink-0 text-white/70 cursor-pointer hover:text-white" />
          )}
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={onCollapse}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/15 hover:text-white",
            collapsed && "justify-center px-0",
          )}
        >
          <ChevronLeft
            className={cn(
              "h-4 w-4 shrink-0 transition-transform",
              collapsed && "rotate-180",
            )}
          />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
