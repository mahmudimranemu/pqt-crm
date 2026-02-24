"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import Image from "next/image";
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
  Target,
  Handshake,
  CalendarDays,
  DollarSign,
  CreditCard,
  Percent,
  Flag,
  CheckSquare,
  MessageSquare,
  FileText,
  TrendingUp,
  Megaphone,
  Trophy,
  UsersRound,
  ClipboardList,
  Globe,
  Zap,
  GitBranch,
  FileSpreadsheet,
  Route,
  Activity,
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

interface NavSection {
  label: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    label: "Main",
    items: [{ title: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Pipeline",
    items: [
      { title: "Leads", href: "/leads", icon: Target },
      { title: "Deals", href: "/deals", icon: Handshake },
    ],
  },
  {
    label: "Contacts",
    items: [
      { title: "Clients", href: "/clients", icon: Users },
      { title: "Enquiries", href: "/clients/enquiries", icon: Mail },
    ],
  },
  {
    label: "Properties",
    items: [
      { title: "Properties", href: "/properties", icon: Building2 },
      { title: "Bookings", href: "/bookings", icon: CalendarDays },
    ],
  },
  {
    label: "Finance",
    items: [
      { title: "Sales", href: "/sales", icon: DollarSign },
      { title: "Payments", href: "/payments", icon: CreditCard },
      { title: "Commissions", href: "/commissions", icon: Percent },
    ],
  },
  {
    label: "Citizenship",
    items: [{ title: "Applications", href: "/citizenship", icon: Flag }],
  },
  {
    label: "Activities",
    items: [
      { title: "Tasks", href: "/tasks", icon: CheckSquare },
      { title: "Communications", href: "/communications", icon: MessageSquare },
      { title: "Documents", href: "/documents", icon: FileText },
    ],
  },
  {
    label: "Analytics",
    items: [
      { title: "KPIs", href: "/kpis", icon: BarChart3 },
      {
        title: "Agent Performance",
        href: "/kpis/performance",
        icon: Activity,
        roles: ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"],
      },
      {
        title: "Reports",
        href: "/reports",
        icon: TrendingUp,
        roles: ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"],
      },
      {
        title: "Campaigns",
        href: "/campaigns",
        icon: Megaphone,
        roles: ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"],
      },
      {
        title: "Leaderboards",
        href: "/leaderboards",
        icon: Trophy,
        roles: ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"],
      },
    ],
  },
  {
    label: "Admin",
    items: [
      {
        title: "Users",
        href: "/settings/users",
        icon: Shield,
        roles: ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"],
      },
      {
        title: "Teams",
        href: "/settings/teams",
        icon: UsersRound,
        roles: ["SUPER_ADMIN", "ADMIN"],
      },
      {
        title: "Audit Log",
        href: "/settings/audit",
        icon: ClipboardList,
        roles: ["SUPER_ADMIN", "ADMIN"],
      },
      {
        title: "Email Templates",
        href: "/settings/email-templates",
        icon: Mail,
        roles: ["SUPER_ADMIN", "ADMIN"],
      },
      {
        title: "Automation",
        href: "/settings/automation",
        icon: Zap,
        roles: ["SUPER_ADMIN", "ADMIN"],
      },
      {
        title: "Pipelines",
        href: "/settings/pipelines",
        icon: GitBranch,
        roles: ["SUPER_ADMIN", "ADMIN"],
      },
      {
        title: "Commissions",
        href: "/settings/commission-setup",
        icon: Percent,
        roles: ["SUPER_ADMIN", "ADMIN"],
      },
      {
        title: "Lead Routing",
        href: "/settings/routing",
        icon: Route,
        roles: ["SUPER_ADMIN", "ADMIN"],
      },
      {
        title: "Import/Export",
        href: "/settings/import-export",
        icon: FileSpreadsheet,
        roles: ["SUPER_ADMIN", "ADMIN"],
      },
      { title: "Settings", href: "/settings", icon: Settings },
    ],
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
        collapsed ? "w-16" : "w-60",
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white overflow-hidden">
            <Image
              src="/favicon.svg"
              alt="Property Quest Turkey"
              width={28}
              height={28}
            />
          </div>
          {!collapsed && (
            <div className="overflow-hidden rounded bg-white px-1">
              <Image
                src="/PQT_logo.svg"
                alt="Property Quest Turkey"
                width={120}
                height={40}
                className="h-10 w-auto object-contain"
              />
            </div>
          )}
        </Link>
      </div>

      {/* Quick Add - hidden for VIEWER */}
      {userRole !== "VIEWER" && (
        <div className="px-3 pb-2">
          <Link
            href="/clients/create"
            className={cn(
              "flex items-center gap-2 rounded-lg bg-white/20 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/30",
              collapsed && "justify-center px-0",
            )}
          >
            <Plus className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Add Lead</span>}
          </Link>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-1 scrollbar-thin">
        {navSections.map((section) => {
          const visibleItems = section.items.filter((item) => {
            if (!item.roles) return true;
            return item.roles.includes(userRole) || userRole === "SUPER_ADMIN";
          });

          if (visibleItems.length === 0) return null;

          return (
            <div key={section.label} className="mb-1">
              {!collapsed && (
                <p className="mb-0.5 px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-white/50">
                  {section.label}
                </p>
              )}
              {collapsed && <div className="my-1 border-t border-white/10" />}
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const isActive =
                    item.href === "/dashboard"
                      ? pathname === "/dashboard"
                      : item.href === "/settings"
                        ? pathname === "/settings" ||
                          pathname === "/settings/profile"
                        : pathname.startsWith(item.href);

                  return (
                    <Link
                      key={item.title}
                      href={item.href}
                      title={collapsed ? item.title : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-white text-[#dc2626]"
                          : "text-white/90 hover:bg-white/15 hover:text-white",
                        collapsed && "justify-center px-0",
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="mt-auto border-t border-white/20 px-3 py-3 space-y-2">
        {/* User Profile */}
        <div
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2",
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
