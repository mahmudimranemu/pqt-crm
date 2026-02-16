"use client";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Area,
} from "recharts";

function formatCurrency(amount: number) {
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
  return `$${amount}`;
}

interface DailyData {
  day: number;
  sales: number;
  revenue: number;
  bookings: number;
}

interface MonthlyRevenueChartProps {
  data: DailyData[];
}

export function MonthlyRevenueChart({ data }: MonthlyRevenueChartProps) {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            interval={4}
          />
          <YAxis
            yAxisId="revenue"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            tickFormatter={formatCurrency}
          />
          <YAxis
            yAxisId="count"
            orientation="right"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "#9ca3af" }}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              fontSize: "12px",
            }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={
              ((value: any, name: any) => {
                if (name === "Revenue")
                  return [formatCurrency(value ?? 0), name];
                return [value ?? 0, name];
              }) as any
            }
            labelFormatter={(label) => `Day ${label}`}
          />
          <Legend
            iconType="circle"
            wrapperStyle={{ paddingTop: "12px", fontSize: "12px" }}
          />
          <Area
            yAxisId="revenue"
            type="monotone"
            dataKey="revenue"
            name="Revenue"
            fill="#dc262620"
            stroke="#dc2626"
            strokeWidth={2}
          />
          <Bar
            yAxisId="count"
            dataKey="sales"
            name="Sales"
            fill="#10b981"
            radius={[3, 3, 0, 0]}
            barSize={8}
          />
          <Bar
            yAxisId="count"
            dataKey="bookings"
            name="Bookings"
            fill="#3b82f6"
            radius={[3, 3, 0, 0]}
            barSize={8}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

interface MonthlyMetricsChartProps {
  metrics: {
    totalCalls: { value: number; target: number };
    totalLeads: { value: number; target: number };
    totalBookings: { value: number; target: number };
    completedViewings: { value: number; target: number };
    totalSales: { value: number; target: number };
    totalRevenue: { value: number; target: number };
    totalCommission: { value: number; target: number };
  };
}

export function MonthlyTargetChart({ metrics }: MonthlyMetricsChartProps) {
  const data = [
    {
      name: "Calls",
      actual: metrics.totalCalls.value,
      target: metrics.totalCalls.target,
    },
    {
      name: "Leads",
      actual: metrics.totalLeads.value,
      target: metrics.totalLeads.target,
    },
    {
      name: "Bookings",
      actual: metrics.totalBookings.value,
      target: metrics.totalBookings.target,
    },
    {
      name: "Viewings",
      actual: metrics.completedViewings.value,
      target: metrics.completedViewings.target,
    },
    {
      name: "Sales",
      actual: metrics.totalSales.value,
      target: metrics.totalSales.target,
    },
  ];

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: "#6b7280" }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "#9ca3af" }}
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
            wrapperStyle={{ paddingTop: "12px", fontSize: "12px" }}
          />
          <Bar
            dataKey="actual"
            name="Actual"
            fill="#dc2626"
            radius={[4, 4, 0, 0]}
            barSize={24}
          />
          <Bar
            dataKey="target"
            name="Target"
            fill="#e5e7eb"
            radius={[4, 4, 0, 0]}
            barSize={24}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
