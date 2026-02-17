"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const COLORS = [
  "#dc2626",
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

// 1. Client Queue Chart
export function ClientQueueChart({
  data,
}: {
  data: {
    agentName: string;
    todayCalls: number;
    previousCalls: number;
    futureCalls: number;
    newLeads: number;
  }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="agentName" />
        <YAxis />
        <Tooltip
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
            fontSize: "12px",
          }}
        />
        <Legend />
        <Bar dataKey="todayCalls" fill="#dc2626" name="Today's Calls" />
        <Bar dataKey="previousCalls" fill="#3b82f6" name="Previous Calls" />
        <Bar dataKey="futureCalls" fill="#10b981" name="Future Calls" />
        <Bar dataKey="newLeads" fill="#f59e0b" name="New Leads" />
      </BarChart>
    </ResponsiveContainer>
  );
}

// 2. Client Distribution Chart
export function ClientDistributionChart({
  data,
}: {
  data: { agentName: string; count: number; percentage: number }[];
}) {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div
          style={{
            backgroundColor: "white",
            padding: "8px 12px",
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
            fontSize: "12px",
          }}
        >
          <p className="font-semibold">{data.agentName}</p>
          <p>Count: {data.count}</p>
          <p>Percentage: {data.percentage.toFixed(1)}%</p>
        </div>
      );
    }
    return null;
  };

  const renderLabel = (entry: any) => {
    return `${entry.percentage.toFixed(1)}%`;
  };

  return (
    <ResponsiveContainer width="100%" height={350}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          fill="#8884d8"
          dataKey="count"
          label={renderLabel}
          labelLine={true}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(value, entry: any) => entry.payload.agentName}
          wrapperStyle={{ fontSize: "12px" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

// 3. Agent Activity Chart
export function AgentActivityChart({
  data,
  agentNames,
  dateRange,
  onDateRangeChange,
}: {
  data: Record<string, string | number>[];
  agentNames: string[];
  dateRange: { from: string; to: string };
  onDateRangeChange: (from: string, to: string) => void;
}) {
  return (
    <div>
      <div className="flex gap-4 mb-4">
        <div className="flex items-center gap-2">
          <label htmlFor="date-from" className="text-sm font-medium">
            From:
          </label>
          <input
            id="date-from"
            type="date"
            value={dateRange.from}
            onChange={(e) => onDateRangeChange(e.target.value, dateRange.to)}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#dc2626]"
          />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="date-to" className="text-sm font-medium">
            To:
          </label>
          <input
            id="date-to"
            type="date"
            value={dateRange.to}
            onChange={(e) => onDateRangeChange(dateRange.from, e.target.value)}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#dc2626]"
          />
        </div>
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              fontSize: "12px",
            }}
          />
          <Legend />
          {agentNames.map((agentName, index) => (
            <Line
              key={agentName}
              type="monotone"
              dataKey={agentName}
              stroke={COLORS[index % COLORS.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// 4. Agent Notes Chart
export function AgentNotesChart({
  data,
  period,
  onPeriodChange,
}: {
  data: {
    agentName: string;
    notesCount: number;
    enquiryNotes: number;
    leadNotes: number;
    activityNotes: number;
  }[];
  period: string;
  onPeriodChange: (period: string) => void;
}) {
  const height = Math.max(300, data.length * 50);

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {["week", "month", "quarter"].map((p) => (
          <button
            key={p}
            onClick={() => onPeriodChange(p)}
            className={`px-3 py-1 text-sm rounded-md ${
              period === p
                ? "bg-[#dc2626] text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis dataKey="agentName" type="category" width={120} />
          <Tooltip
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              fontSize: "12px",
            }}
          />
          <Legend />
          <Bar
            dataKey="enquiryNotes"
            stackId="a"
            fill="#dc2626"
            name="Enquiry Notes"
          />
          <Bar dataKey="leadNotes" stackId="a" fill="#3b82f6" name="Lead Notes" />
          <Bar
            dataKey="activityNotes"
            stackId="a"
            fill="#10b981"
            name="Activity Notes"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// 5. Sales Performance Table
export function SalesPerformanceTable({
  data,
  period,
  onPeriodChange,
}: {
  data: {
    agentName: string;
    agentId: string;
    totalSales: number;
    totalRevenue: number;
    totalBookings: number;
    totalCalls: number;
    totalLeads: number;
    totalDeals: number;
    wonDeals: number;
    conversionRate: number;
  }[];
  period: string;
  onPeriodChange: (period: string) => void;
}) {
  const sortedData = [...data].sort((a, b) => b.totalRevenue - a.totalRevenue);
  const topPerformerId = sortedData[0]?.agentId;

  const totals = data.reduce(
    (acc, row) => ({
      totalSales: acc.totalSales + row.totalSales,
      totalRevenue: acc.totalRevenue + row.totalRevenue,
      totalBookings: acc.totalBookings + row.totalBookings,
      totalCalls: acc.totalCalls + row.totalCalls,
      totalLeads: acc.totalLeads + row.totalLeads,
      totalDeals: acc.totalDeals + row.totalDeals,
      wonDeals: acc.wonDeals + row.wonDeals,
    }),
    {
      totalSales: 0,
      totalRevenue: 0,
      totalBookings: 0,
      totalCalls: 0,
      totalLeads: 0,
      totalDeals: 0,
      wonDeals: 0,
    }
  );

  const avgConversionRate =
    totals.totalDeals > 0 ? (totals.wonDeals / totals.totalDeals) * 100 : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {["week", "month", "quarter", "year"].map((p) => (
          <button
            key={p}
            onClick={() => onPeriodChange(p)}
            className={`px-3 py-1 text-sm rounded-md ${
              period === p
                ? "bg-[#dc2626] text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agent</TableHead>
              <TableHead className="text-right">Sales</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">Bookings</TableHead>
              <TableHead className="text-right">Calls</TableHead>
              <TableHead className="text-right">Leads</TableHead>
              <TableHead className="text-right">Deals</TableHead>
              <TableHead className="text-right">Won</TableHead>
              <TableHead className="text-right">Conv. Rate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((row) => (
              <TableRow
                key={row.agentId}
                className={
                  row.agentId === topPerformerId ? "bg-green-50" : undefined
                }
              >
                <TableCell className="font-medium">{row.agentName}</TableCell>
                <TableCell className="text-right">{row.totalSales}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(row.totalRevenue)}
                </TableCell>
                <TableCell className="text-right">{row.totalBookings}</TableCell>
                <TableCell className="text-right">{row.totalCalls}</TableCell>
                <TableCell className="text-right">{row.totalLeads}</TableCell>
                <TableCell className="text-right">{row.totalDeals}</TableCell>
                <TableCell className="text-right">{row.wonDeals}</TableCell>
                <TableCell className="text-right">
                  {row.conversionRate.toFixed(1)}%
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-gray-50 font-semibold">
              <TableCell>Total</TableCell>
              <TableCell className="text-right">{totals.totalSales}</TableCell>
              <TableCell className="text-right">
                {formatCurrency(totals.totalRevenue)}
              </TableCell>
              <TableCell className="text-right">{totals.totalBookings}</TableCell>
              <TableCell className="text-right">{totals.totalCalls}</TableCell>
              <TableCell className="text-right">{totals.totalLeads}</TableCell>
              <TableCell className="text-right">{totals.totalDeals}</TableCell>
              <TableCell className="text-right">{totals.wonDeals}</TableCell>
              <TableCell className="text-right">
                {avgConversionRate.toFixed(1)}%
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// 6. Daily Breakdown Table
export function DailyBreakdownTable({
  data,
  date,
  onDateChange,
}: {
  data: {
    agentName: string;
    agentId: string;
    calls: number;
    emails: number;
    meetings: number;
    notes: number;
    newEnquiries: number;
    newLeads: number;
  }[];
  date: string;
  onDateChange: (date: string) => void;
}) {
  const dataWithTotals = data.map((row) => ({
    ...row,
    total:
      row.calls +
      row.emails +
      row.meetings +
      row.notes +
      row.newEnquiries +
      row.newLeads,
  }));

  const sortedData = [...dataWithTotals].sort((a, b) => b.total - a.total);

  const totals = data.reduce(
    (acc, row) => ({
      calls: acc.calls + row.calls,
      emails: acc.emails + row.emails,
      meetings: acc.meetings + row.meetings,
      notes: acc.notes + row.notes,
      newEnquiries: acc.newEnquiries + row.newEnquiries,
      newLeads: acc.newLeads + row.newLeads,
    }),
    {
      calls: 0,
      emails: 0,
      meetings: 0,
      notes: 0,
      newEnquiries: 0,
      newLeads: 0,
    }
  );

  const grandTotal = Object.values(totals).reduce((sum, val) => sum + val, 0);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <label htmlFor="date-picker" className="text-sm font-medium">
          Date:
        </label>
        <input
          id="date-picker"
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#dc2626]"
        />
      </div>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agent</TableHead>
              <TableHead className="text-right">Calls</TableHead>
              <TableHead className="text-right">Emails</TableHead>
              <TableHead className="text-right">Meetings</TableHead>
              <TableHead className="text-right">Notes</TableHead>
              <TableHead className="text-right">New Enquiries</TableHead>
              <TableHead className="text-right">New Leads</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((row) => (
              <TableRow key={row.agentId}>
                <TableCell className="font-medium">{row.agentName}</TableCell>
                <TableCell className="text-right">{row.calls}</TableCell>
                <TableCell className="text-right">{row.emails}</TableCell>
                <TableCell className="text-right">{row.meetings}</TableCell>
                <TableCell className="text-right">{row.notes}</TableCell>
                <TableCell className="text-right">{row.newEnquiries}</TableCell>
                <TableCell className="text-right">{row.newLeads}</TableCell>
                <TableCell className="text-right font-semibold">
                  {row.total}
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-gray-50 font-semibold">
              <TableCell>Total</TableCell>
              <TableCell className="text-right">{totals.calls}</TableCell>
              <TableCell className="text-right">{totals.emails}</TableCell>
              <TableCell className="text-right">{totals.meetings}</TableCell>
              <TableCell className="text-right">{totals.notes}</TableCell>
              <TableCell className="text-right">{totals.newEnquiries}</TableCell>
              <TableCell className="text-right">{totals.newLeads}</TableCell>
              <TableCell className="text-right">{grandTotal}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
