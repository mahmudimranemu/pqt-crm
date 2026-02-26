"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
} from "lucide-react";
import type { UserRole, Office } from "@prisma/client";

const roleLabels: Record<UserRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  SALES_MANAGER: "Senior Consultant",
  SALES_AGENT: "Consultant",
  VIEWER: "Junior Consultant",
};

const roleColors: Record<UserRole, string> = {
  SUPER_ADMIN: "bg-red-100 text-red-700 border-red-200",
  ADMIN: "bg-blue-100 text-blue-700 border-blue-200",
  SALES_MANAGER: "bg-orange-100 text-orange-700 border-orange-200",
  SALES_AGENT: "bg-blue-100 text-blue-700 border-blue-200",
  VIEWER: "bg-gray-100 text-gray-700 border-gray-200",
};

const officeLabels: Record<string, string> = {
  HEAD_OFFICE: "Head Office",
  UAE: "UAE",
  TURKEY: "Turkey",
  UK: "UK",
  MALAYSIA: "Malaysia",
  BANGLADESH: "Bangladesh",
};

interface ProfileHeaderProps {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    office: Office;
    isActive: boolean;
    phone: string | null;
    avatar: string | null;
    lastSeen: string | null;
    createdAt: string;
  };
  isSuperAdmin: boolean;
  stats: {
    totalEnquiries: number;
    totalLeads: number;
    totalClients: number;
    totalSales: number;
  } | null;
}

function isOnline(lastSeen: string | null): boolean {
  if (!lastSeen) return false;
  const diff = Date.now() - new Date(lastSeen).getTime();
  return diff < 5 * 60 * 1000;
}

export function ProfileHeader({ user, isSuperAdmin, stats }: ProfileHeaderProps) {
  const online = isOnline(user.lastSeen);

  return (
    <Card className="border border-gray-200">
      <CardContent className="p-6">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="relative">
            <div
              className={`flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold ${
                user.role === "SUPER_ADMIN"
                  ? "bg-red-100 text-red-700 ring-2 ring-red-300"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {user.firstName[0]}
              {user.lastName[0]}
            </div>
            {online && (
              <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white">
                <span className="absolute h-3 w-3 animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative h-3 w-3 rounded-full bg-green-500" />
              </span>
            )}
          </div>

          {/* User Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {user.firstName} {user.lastName}
              </h1>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${roleColors[user.role]}`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {roleLabels[user.role]}
              </span>
              {user.isActive ? (
                <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">
                  Active
                </Badge>
              ) : (
                <Badge className="bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100">
                  Away
                </Badge>
              )}
              {online && (
                <span className="flex items-center gap-1 text-xs font-medium text-green-600">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                  </span>
                  Online
                </span>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-600">
              <span className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-gray-400" />
                {user.email}
              </span>
              {user.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-gray-400" />
                  {user.phone}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-gray-400" />
                {officeLabels[user.office] || user.office}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-gray-400" />
                Joined {new Date(user.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </span>
              {user.lastSeen && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-gray-400" />
                  Last seen {new Date(user.lastSeen).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>
          </div>

          {/* Quick Stats (admin only) */}
          {isSuperAdmin && stats && (
            <div className="hidden md:flex items-center gap-6">
              {[
                { label: "Enquiries", value: stats.totalEnquiries },
                { label: "Leads", value: stats.totalLeads },
                { label: "Clients", value: stats.totalClients },
                { label: "Sales", value: stats.totalSales },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
