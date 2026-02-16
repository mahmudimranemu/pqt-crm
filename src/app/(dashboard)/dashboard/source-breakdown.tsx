"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const COLORS = [
  "#dc2626",
  "#0150B5",
  "#2563eb",
  "#60a5fa",
  "#93c5fd",
  "#06b6d4",
  "#14b8a6",
  "#22c55e",
];

interface Props {
  data: { source: string; count: number }[];
}

export function SourceBreakdown({ data }: Props) {
  if (!data.length) {
    return (
      <div className="flex h-[250px] items-center justify-center text-sm text-gray-400">
        No source data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={90}
          dataKey="count"
          nameKey="source"
          paddingAngle={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
            fontSize: "12px",
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: "11px" }}
          iconType="circle"
          iconSize={8}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
