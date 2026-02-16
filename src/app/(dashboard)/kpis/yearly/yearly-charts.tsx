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
  FunnelChart,
  Funnel,
  LabelList,
  Cell,
} from "recharts";

function formatCurrency(amount: number) {
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
  return `$${amount}`;
}

interface MonthlyData {
  month: string;
  sales: number;
  revenue: number;
}

interface YearlyRevenueChartProps {
  data: MonthlyData[];
}

export function YearlyRevenueChart({ data }: YearlyRevenueChartProps) {
  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: "#6b7280" }}
          />
          <YAxis
            yAxisId="revenue"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            tickFormatter={formatCurrency}
          />
          <YAxis
            yAxisId="sales"
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
            fill="#dc262615"
            stroke="#dc2626"
            strokeWidth={2}
          />
          <Bar
            yAxisId="sales"
            dataKey="sales"
            name="Sales"
            fill="#3b82f6"
            radius={[4, 4, 0, 0]}
            barSize={20}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

interface YearlyTargetChartProps {
  metrics: {
    totalLeads: { value: number; target: number };
    totalBookings: { value: number; target: number };
    completedViewings: { value: number; target: number };
    totalSales: { value: number; target: number };
    totalRevenue: { value: number; target: number };
    totalCommission: { value: number; target: number };
  };
}

export function YearlyTargetChart({ metrics }: YearlyTargetChartProps) {
  const data = [
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
            barSize={28}
          />
          <Bar
            dataKey="target"
            name="Target"
            fill="#e5e7eb"
            radius={[4, 4, 0, 0]}
            barSize={28}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface ConversionFunnelProps {
  leads: number;
  bookings: number;
  viewings: number;
  sales: number;
}

const FUNNEL_COLORS = ["#dc2626", "#f59e0b", "#3b82f6", "#10b981"];

export function ConversionFunnel({
  leads,
  bookings,
  viewings,
  sales,
}: ConversionFunnelProps) {
  const data = [
    { name: "Leads", value: leads, fill: FUNNEL_COLORS[0] },
    { name: "Bookings", value: bookings, fill: FUNNEL_COLORS[1] },
    { name: "Viewings", value: viewings, fill: FUNNEL_COLORS[2] },
    { name: "Sales", value: sales, fill: FUNNEL_COLORS[3] },
  ];

  // If all values are 0, show placeholder
  if (leads === 0 && bookings === 0 && viewings === 0 && sales === 0) {
    return (
      <div className="flex items-center justify-center h-[280px] text-gray-400 text-sm">
        No conversion data available yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((stage, i) => {
        const maxVal = Math.max(leads, 1);
        const width = Math.max((stage.value / maxVal) * 100, 15);
        const rate =
          i > 0 && data[i - 1].value > 0
            ? ((stage.value / data[i - 1].value) * 100).toFixed(0)
            : null;

        return (
          <div key={stage.name} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">{stage.name}</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900">
                  {stage.value}
                </span>
                {rate && (
                  <span className="text-xs text-gray-400">({rate}%)</span>
                )}
              </div>
            </div>
            <div className="h-8 w-full rounded bg-gray-100 flex items-center justify-center">
              <div
                className="h-8 rounded transition-all"
                style={{
                  width: `${width}%`,
                  backgroundColor: stage.fill,
                  marginLeft: `${(100 - width) / 2}%`,
                  marginRight: `${(100 - width) / 2}%`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
