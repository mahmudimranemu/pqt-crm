"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const data = [
  { month: "Jan", leads: 120, conversions: 45 },
  { month: "Feb", leads: 180, conversions: 65 },
  { month: "Mar", leads: 240, conversions: 85 },
  { month: "Apr", leads: 280, conversions: 110 },
  { month: "May", leads: 350, conversions: 130 },
  { month: "Jun", leads: 420, conversions: 145 },
  { month: "Jul", leads: 380, conversions: 140 },
  { month: "Aug", leads: 450, conversions: 155 },
  { month: "Sep", leads: 410, conversions: 150 },
  { month: "Oct", leads: 480, conversions: 160 },
  { month: "Nov", leads: 520, conversions: 175 },
  { month: "Dec", leads: 540, conversions: 180 },
];

export function LeadAnalyticsChart() {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
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
            }}
          />
          <Legend
            iconType="circle"
            wrapperStyle={{ paddingTop: "16px" }}
          />
          <Line
            type="monotone"
            dataKey="leads"
            name="Leads"
            stroke="#67c5c5"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="conversions"
            name="Conversions"
            stroke="#2dd4a8"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
