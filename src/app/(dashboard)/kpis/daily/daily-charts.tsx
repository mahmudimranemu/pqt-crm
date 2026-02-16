"use client";

import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  PolarAngleAxis,
} from "recharts";

interface MetricGaugeProps {
  title: string;
  value: number;
  target: number;
  color: string;
  isCurrency?: boolean;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function MetricGauge({ title, value, target, color, isCurrency }: MetricGaugeProps) {
  const percentage = target > 0 ? Math.min((value / target) * 100, 100) : 0;
  const data = [{ value: percentage, fill: color }];

  return (
    <div className="flex flex-col items-center">
      <div className="h-[120px] w-[120px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="70%"
            outerRadius="100%"
            startAngle={90}
            endAngle={-270}
            data={data}
            barSize={10}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} angleAxisId={0} />
            <RadialBar
              background={{ fill: "#f3f4f6" }}
              dataKey="value"
              cornerRadius={5}
              angleAxisId={0}
            />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>
      <div className="text-center -mt-2">
        <p className="text-lg font-bold text-gray-900">
          {isCurrency ? formatCurrency(value) : value}
        </p>
        <p className="text-xs text-gray-500">{title}</p>
        <p className="text-[10px] text-gray-400">
          {percentage.toFixed(0)}% of {isCurrency ? formatCurrency(target) : target}
        </p>
      </div>
    </div>
  );
}

interface DailyGaugesProps {
  metrics: {
    callsMade: { value: number; target: number };
    newLeads: { value: number; target: number };
    bookingsScheduled: { value: number; target: number };
    viewingsCompleted: { value: number; target: number };
    salesClosed: { value: number; target: number };
    salesRevenue: { value: number; target: number };
  };
}

export function DailyGauges({ metrics }: DailyGaugesProps) {
  const gauges = [
    { title: "Calls", ...metrics.callsMade, color: "#3b82f6" },
    { title: "New Leads", ...metrics.newLeads, color: "#8b5cf6" },
    { title: "Bookings", ...metrics.bookingsScheduled, color: "#f59e0b" },
    { title: "Viewings", ...metrics.viewingsCompleted, color: "#06b6d4" },
    { title: "Sales", ...metrics.salesClosed, color: "#10b981" },
    { title: "Revenue", ...metrics.salesRevenue, color: "#dc2626", isCurrency: true },
  ];

  return (
    <div className="grid grid-cols-3 gap-4 md:grid-cols-6">
      {gauges.map((g) => (
        <MetricGauge key={g.title} {...g} />
      ))}
    </div>
  );
}
