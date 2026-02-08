import { getUsers } from "@/lib/actions/users";
import { Card, CardContent } from "@/components/ui/card";
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
  UserPlus,
  MoreVertical,
  Mail,
  Phone,
} from "lucide-react";
import type { UserRole, Office } from "@prisma/client";
import { CreateUserDialog } from "./create-user-dialog";
import { UserActions } from "./user-actions";
import Link from "next/link";

const roleColors: Record<UserRole, string> = {
  SUPER_ADMIN: "bg-red-100 text-red-700 border-red-200",
  ADMIN: "bg-red-100 text-red-700 border-red-200",
  SALES_MANAGER: "bg-orange-100 text-orange-700 border-orange-200",
  SALES_AGENT: "bg-red-100 text-red-700 border-red-200",
  VIEWER: "bg-gray-100 text-gray-700 border-gray-200",
};

const roleLabels: Record<UserRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  SALES_MANAGER: "Senior Consultant",
  SALES_AGENT: "Consultant",
  VIEWER: "Junior Consultant",
};

const officeLabels: Record<Office, string> = {
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
  { key: "reallocation", label: "Reallocation Pool", icon: Shield },
  { key: "performance", label: "Performance", icon: Activity },
  { key: "activity", label: "Activity Logs", icon: Clock },
  { key: "settings", label: "Settings", icon: Shield },
];

export default async function UsersPage() {
  const { users, total } = await getUsers();

  const activeUsers = users.filter((u) => u.isActive).length;
  const awayUsers = users.filter((u) => !u.isActive).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
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
                <p className="mt-1 text-xs text-gray-500">+2 this month</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
                <Users className="h-5 w-5 text-[#dc2626]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Leads</p>
                <p className="mt-1 text-3xl font-bold text-gray-900">342</p>
                <p className="mt-1 text-xs text-gray-500">+54 this week</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50">
                <Activity className="h-5 w-5 text-teal-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">System Health</p>
                <p className="mt-1 text-3xl font-bold text-gray-900">98.5%</p>
                <p className="mt-1 text-xs text-gray-500">Uptime</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50">
                <Activity className="h-5 w-5 text-teal-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Avg Response Time</p>
                <p className="mt-1 text-3xl font-bold text-gray-900">2.4h</p>
                <p className="mt-1 text-xs text-gray-500">-0.3h improvement</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
                <Clock className="h-5 w-5 text-[#dc2626]" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab.key === "users"
                ? "border-b-2 border-[#dc2626] text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* User Management Content */}
      <Card className="border border-gray-200">
        <div className="flex items-center justify-between border-b border-gray-100 p-5">
          <h2 className="text-lg font-semibold text-gray-900">
            User Management
          </h2>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Search users..."
                className="w-[200px] bg-white pl-10"
              />
            </div>
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
                            ID: {user.id.slice(0, 4)}
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
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${roleColors[user.role]}`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {roleLabels[user.role]}
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
    </div>
  );
}
