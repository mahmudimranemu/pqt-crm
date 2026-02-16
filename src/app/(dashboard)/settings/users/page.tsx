import { getUsers } from "@/lib/actions/users";
import { getLeadStats } from "@/lib/actions/leads";
import { getAuditLogs } from "@/lib/actions/audit";
import { getAgentPerformance } from "@/lib/actions/kpis";
import { auth, type ExtendedSession } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Shield,
  Activity,
  Clock,
  Search,
  Mail,
  Phone,
  RefreshCw,
  Settings,
  Target,
  DollarSign,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import type { UserRole, Office } from "@prisma/client";
import { CreateUserDialog } from "./create-user-dialog";
import { UserActions } from "./user-actions";
import { ReallocationPool } from "./reallocation-pool";
import Link from "next/link";
import { formatDate, formatDateTime } from "@/lib/utils";

const roleColors: Record<UserRole, string> = {
  SUPER_ADMIN: "bg-blue-100 text-blue-700 border-blue-200",
  ADMIN: "bg-blue-100 text-blue-700 border-blue-200",
  SALES_MANAGER: "bg-orange-100 text-orange-700 border-orange-200",
  SALES_AGENT: "bg-blue-100 text-blue-700 border-blue-200",
  VIEWER: "bg-gray-100 text-gray-700 border-gray-200",
};

const roleLabels: Record<UserRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  SALES_MANAGER: "Senior Consultant",
  SALES_AGENT: "Consultant",
  VIEWER: "Junior Consultant",
};

const officeLabels: Record<string, string> = {
  HEAD_OFFICE: "Head Office",
  UAE: "UAE",
  TURKEY: "Turkey",
  UK: "UK",
  MALAYSIA: "Malaysia",
  BANGLADESH: "Bangladesh",
};

const tabs = [
  { key: "users", label: "User Management", icon: Users },
  { key: "distribution", label: "Lead Distribution", icon: Activity },
  { key: "reallocation", label: "Reallocation Pool", icon: RefreshCw },
  { key: "performance", label: "Performance", icon: BarChart3 },
  { key: "activity", label: "Activity Logs", icon: Clock },
  { key: "settings", label: "Settings", icon: Settings },
];

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function UsersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const activeTab = params.tab || "users";
  const session = (await auth()) as ExtendedSession | null;

  const { users, total } = await getUsers();
  const activeUsers = users.filter((u) => u.isActive).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
          <Shield className="h-5 w-5 text-[#dc2626]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-gray-500">
            Manage users, leads, and system settings
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Users</p>
                <p className="mt-1 text-3xl font-bold text-gray-900">{total}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {activeUsers} active
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                <Users className="h-5 w-5 text-[#dc2626]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Consultants</p>
                <p className="mt-1 text-3xl font-bold text-gray-900">
                  {
                    users.filter(
                      (u) =>
                        u.role === "SALES_AGENT" || u.role === "SALES_MANAGER",
                    ).length
                  }
                </p>
                <p className="mt-1 text-xs text-gray-500">Active agents</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50">
                <Target className="h-5 w-5 text-teal-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Admins</p>
                <p className="mt-1 text-3xl font-bold text-gray-900">
                  {
                    users.filter(
                      (u) => u.role === "SUPER_ADMIN" || u.role === "ADMIN",
                    ).length
                  }
                </p>
                <p className="mt-1 text-xs text-gray-500">System admins</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50">
                <Shield className="h-5 w-5 text-teal-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Away / Inactive</p>
                <p className="mt-1 text-3xl font-bold text-gray-900">
                  {total - activeUsers}
                </p>
                <p className="mt-1 text-xs text-gray-500">Currently away</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                <Clock className="h-5 w-5 text-[#dc2626]" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200 overflow-x-auto">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={`/settings/users${tab.key === "users" ? "" : `?tab=${tab.key}`}`}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? "border-b-2 border-[#dc2626] text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "users" && <UserManagementTab users={users} />}
      {activeTab === "distribution" && <LeadDistributionTab users={users} />}
      {activeTab === "reallocation" && <ReallocationPool />}
      {activeTab === "performance" && <PerformanceTab />}
      {activeTab === "activity" && <ActivityLogsTab />}
      {activeTab === "settings" && <SettingsTab />}
    </div>
  );
}

/* ========== USER MANAGEMENT TAB ========== */
function UserManagementTab({ users }: { users: any[] }) {
  return (
    <Card className="border border-gray-200">
      <div className="flex items-center justify-between border-b border-gray-100 p-5">
        <h2 className="text-lg font-semibold text-gray-900">User Management</h2>
        <div className="flex items-center gap-3">
          <CreateUserDialog />
        </div>
      </div>
      <CardContent className="p-0">
        {users.length === 0 ? (
          <div className="py-12 text-center">
            <Users className="mx-auto mb-4 h-12 w-12 text-gray-300" />
            <p className="text-gray-500">No users found.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-b border-gray-100 bg-gray-50/50">
                <TableHead className="text-xs font-medium text-gray-500">
                  User
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500">
                  Contact
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500">
                  Role
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500">
                  Status
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500">
                  Leads
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500">
                  Conversions
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow
                  key={user.id}
                  className="border-b border-gray-50 hover:bg-gray-50/50"
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-600">
                        {user.firstName[0]}
                        {user.lastName[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {officeLabels[user.office] || user.office}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <Mail className="h-3 w-3" />
                        {user.email}
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-gray-500">
                        <Phone className="h-3 w-3" />
                        {user.phone || "—"}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${roleColors[user.role as UserRole]}`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {roleLabels[user.role as UserRole]}
                    </span>
                  </TableCell>
                  <TableCell>
                    {user.isActive ? (
                      <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">
                        Active
                      </Badge>
                    ) : (
                      <Badge className="bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100">
                        Away
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm font-medium text-gray-900">
                    {user._count.clients || 0}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium text-[#dc2626]">
                      {user._count.sales || 0}
                    </span>
                  </TableCell>
                  <TableCell>
                    <UserActions user={user} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

/* ========== LEAD DISTRIBUTION TAB ========== */
function LeadDistributionTab({ users }: { users: any[] }) {
  const agents = users.filter(
    (u) =>
      u.isActive && (u.role === "SALES_AGENT" || u.role === "SALES_MANAGER"),
  );

  return (
    <div className="space-y-6">
      <Card className="border border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Lead Distribution by Consultant
          </CardTitle>
          <p className="text-sm text-gray-500">
            Shows how leads are distributed across consultants
          </p>
        </CardHeader>
        <CardContent>
          {agents.length === 0 ? (
            <p className="text-center py-8 text-gray-500">
              No active consultants.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50">
                  <TableHead className="text-xs font-medium text-gray-500">
                    Consultant
                  </TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">
                    Office
                  </TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">
                    Role
                  </TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">
                    Assigned Clients
                  </TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">
                    Sales
                  </TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((agent) => (
                  <TableRow key={agent.id} className="hover:bg-gray-50/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-[#dc2626]">
                          {agent.firstName[0]}
                          {agent.lastName[0]}
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {agent.firstName} {agent.lastName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {officeLabels[agent.office] || agent.office}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${roleColors[agent.role as UserRole]}`}
                      >
                        {roleLabels[agent.role as UserRole]}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm font-medium text-gray-900">
                      {agent._count.clients || 0}
                    </TableCell>
                    <TableCell className="text-sm font-medium text-[#dc2626]">
                      {agent._count.sales || 0}
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">
                        Active
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ========== PERFORMANCE TAB ========== */
async function PerformanceTab() {
  let agentStats: any[] = [];
  try {
    agentStats = await getAgentPerformance("month");
  } catch {
    // May fail for non-admin users
  }

  return (
    <div className="space-y-6">
      <Card className="border border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Agent Performance — This Month
          </CardTitle>
          <p className="text-sm text-gray-500">
            Sales, revenue, and activity metrics by consultant
          </p>
        </CardHeader>
        <CardContent>
          {agentStats.length === 0 ? (
            <p className="text-center py-8 text-gray-500">
              No performance data available.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50">
                  <TableHead className="text-xs font-medium text-gray-500">
                    Consultant
                  </TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">
                    Office
                  </TableHead>
                  <TableHead className="text-xs font-medium text-gray-500 text-right">
                    Calls
                  </TableHead>
                  <TableHead className="text-xs font-medium text-gray-500 text-right">
                    Bookings
                  </TableHead>
                  <TableHead className="text-xs font-medium text-gray-500 text-right">
                    Sales
                  </TableHead>
                  <TableHead className="text-xs font-medium text-gray-500 text-right">
                    Revenue
                  </TableHead>
                  <TableHead className="text-xs font-medium text-gray-500 text-right">
                    Commission
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agentStats.map((agent, i) => (
                  <TableRow key={agent.agentId} className="hover:bg-gray-50/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white ${i === 0 ? "bg-yellow-500" : i === 1 ? "bg-gray-400" : i === 2 ? "bg-amber-700" : "bg-gray-200 text-gray-600"}`}
                        >
                          {i + 1}
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {agent.agentName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {officeLabels[agent.office] || agent.office}
                    </TableCell>
                    <TableCell className="text-sm text-right text-gray-900">
                      {agent.calls}
                    </TableCell>
                    <TableCell className="text-sm text-right text-gray-900">
                      {agent.bookings}
                    </TableCell>
                    <TableCell className="text-sm text-right font-medium text-gray-900">
                      {agent.salesCount}
                    </TableCell>
                    <TableCell className="text-sm text-right font-medium text-[#dc2626]">
                      ${agent.revenue.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm text-right text-emerald-600 font-medium">
                      ${agent.commission.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ========== ACTIVITY LOGS TAB ========== */
async function ActivityLogsTab() {
  let logs: any[] = [];
  try {
    const result = await getAuditLogs({ limit: 50 });
    logs = result.logs;
  } catch {
    // May fail
  }

  const actionColors: Record<string, string> = {
    CREATE: "bg-emerald-100 text-emerald-700",
    UPDATE: "bg-blue-100 text-blue-700",
    DELETE: "bg-red-100 text-red-700",
    LOGIN: "bg-purple-100 text-purple-700",
    LOGOUT: "bg-gray-100 text-gray-700",
    ASSIGN: "bg-orange-100 text-orange-700",
    STAGE_CHANGE: "bg-yellow-100 text-yellow-700",
    EXPORT: "bg-teal-100 text-teal-700",
    IMPORT: "bg-indigo-100 text-indigo-700",
  };

  return (
    <Card className="border border-gray-200">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">
          Activity Logs
        </CardTitle>
        <p className="text-sm text-gray-500">
          Recent system activity and audit trail
        </p>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="text-gray-500">No activity logs yet.</p>
            <p className="text-xs text-gray-400 mt-1">
              Activity will be recorded as users interact with the system.
            </p>
          </div>
        ) : (
          <div className="space-y-0">
            {logs.map((log: any) => (
              <div
                key={log.id}
                className="flex items-start gap-4 py-3 border-b border-gray-100 last:border-0"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600 shrink-0">
                  {log.user?.firstName?.[0] || "?"}
                  {log.user?.lastName?.[0] || ""}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-900">
                      {log.user?.firstName} {log.user?.lastName}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${actionColors[log.action] || "bg-gray-100 text-gray-700"}`}
                    >
                      {log.action}
                    </span>
                    <span className="text-xs text-gray-500">
                      {log.entityType}
                    </span>
                  </div>
                  {log.description && (
                    <p className="text-sm text-gray-600 mt-0.5 truncate">
                      {log.description}
                    </p>
                  )}
                </div>
                <span className="text-xs text-gray-400 shrink-0">
                  {formatDateTime(log.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ========== SETTINGS TAB ========== */
function SettingsTab() {
  return (
    <div className="space-y-6">
      <Card className="border border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            System Settings
          </CardTitle>
          <p className="text-sm text-gray-500">
            Configure system-wide preferences
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">
                Company Name
              </label>
              <Input
                defaultValue="PropertyFlow CRM"
                className="bg-white"
                disabled
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">
                Default Currency
              </label>
              <Input defaultValue="USD" className="bg-white" disabled />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">
                Default Timezone
              </label>
              <Input defaultValue="UTC" className="bg-white" disabled />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">
                Date Format
              </label>
              <Input defaultValue="DD/MM/YYYY" className="bg-white" disabled />
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Lead Assignment Pools
            </h3>
            <div className="space-y-3">
              {["Pool 1", "Pool 2", "Pool 3"].map((pool) => (
                <div
                  key={pool}
                  className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{pool}</p>
                    <p className="text-xs text-gray-500">
                      Unassigned leads waiting for reallocation
                    </p>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100">
                    Active
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
