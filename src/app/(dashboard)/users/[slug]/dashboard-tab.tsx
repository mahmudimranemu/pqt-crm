"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Target, Users, TrendingUp, Handshake, DollarSign } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface DashboardTabProps {
  stats: {
    totalEnquiries: number;
    totalLeads: number;
    totalClients: number;
    totalDeals: number;
    wonDeals: number;
    totalSales: number;
    conversionRate: number;
    activityByMonth: { month: string; enquiries: number; leads: number }[];
  };
}

export function DashboardTab({ stats }: DashboardTabProps) {
  const kpiCards = [
    {
      title: "Total Enquiries",
      value: stats.totalEnquiries,
      icon: Mail,
      iconBg: "bg-blue-50",
      iconColor: "text-[#dc2626]",
    },
    {
      title: "Total Leads",
      value: stats.totalLeads,
      icon: Target,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      title: "Total Clients",
      value: stats.totalClients,
      icon: Users,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },
    {
      title: "Total Deals",
      value: stats.totalDeals,
      subtitle: `${stats.wonDeals} won`,
      icon: Handshake,
      iconBg: "bg-purple-50",
      iconColor: "text-purple-600",
    },
    {
      title: "Total Sales",
      value: stats.totalSales,
      icon: DollarSign,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
    },
    {
      title: "Conversion Rate",
      value: `${stats.conversionRate}%`,
      subtitle: "Leads to deals",
      icon: TrendingUp,
      iconBg: stats.conversionRate > 20 ? "bg-emerald-50" : "bg-red-50",
      iconColor: stats.conversionRate > 20 ? "text-emerald-600" : "text-[#dc2626]",
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {kpiCards.map((card) => (
          <Card key={card.title} className="border border-gray-200">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500">
                    {card.title}
                  </p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    {card.value}
                  </p>
                  {card.subtitle && (
                    <p className="mt-0.5 text-xs text-gray-500">
                      {card.subtitle}
                    </p>
                  )}
                </div>
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.iconBg}`}
                >
                  <card.icon className={`h-5 w-5 ${card.iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Activity Chart */}
      <Card className="border border-gray-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold text-gray-900">
            Activity Over Time
          </CardTitle>
          <p className="text-sm text-gray-500">
            Monthly enquiries and leads assigned to this user
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={stats.activityByMonth}
                margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
              >
                <defs>
                  <linearGradient
                    id="enquiriesGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#dc2626" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient
                    id="leadsGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#9ca3af" }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#9ca3af" }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    fontSize: "12px",
                  }}
                />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ paddingTop: "16px", fontSize: "12px" }}
                />
                <Area
                  type="monotone"
                  dataKey="enquiries"
                  name="Enquiries"
                  stroke="#dc2626"
                  fill="url(#enquiriesGradient)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Area
                  type="monotone"
                  dataKey="leads"
                  name="Leads"
                  stroke="#2563eb"
                  fill="url(#leadsGradient)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
