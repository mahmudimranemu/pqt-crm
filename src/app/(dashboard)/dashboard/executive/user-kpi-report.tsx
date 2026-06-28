"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  ArrowDown,
  ArrowUp,
  CalendarCheck,
  CalendarClock,
  CalendarX,
  Mail,
  Minus,
  Phone,
  StickyNote,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAgentsList } from "@/lib/actions/communications";
import {
  getLatestActivityAgentId,
  getUserKpiReport,
  type KpiPeriod,
} from "@/lib/actions/executive";

type Agent = { id: string; firstName: string; lastName: string };
type Report = Awaited<ReturnType<typeof getUserKpiReport>>;

const PERIODS: { value: KpiPeriod; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

const PREV_LABEL: Record<KpiPeriod, string> = {
  daily: "yesterday",
  weekly: "last week",
  monthly: "last month",
  yearly: "last year",
};

function deltaInfo(cur: number, prev: number): {
  label: string;
  dir: "up" | "down" | "flat";
} {
  if (prev === 0) {
    return cur > 0 ? { label: "new", dir: "up" } : { label: "—", dir: "flat" };
  }
  const pct = Math.round(((cur - prev) / prev) * 100);
  if (pct === 0) return { label: "0%", dir: "flat" };
  return { label: `${pct > 0 ? "+" : ""}${pct}%`, dir: pct > 0 ? "up" : "down" };
}

/** Larger overall-performance pill shown next to the user's name. */
function OverallBadge({ cur, prev, vs }: { cur: number; prev: number; vs: string }) {
  const d = deltaInfo(cur, prev);
  const Arrow = d.dir === "up" ? ArrowUp : d.dir === "down" ? ArrowDown : Minus;
  const tone =
    d.dir === "up"
      ? "bg-emerald-50 text-emerald-700"
      : d.dir === "down"
        ? "bg-red-50 text-red-700"
        : "bg-gray-100 text-gray-600";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}
      title={`${cur} vs ${prev} ${vs} (overall activity)`}
    >
      <Arrow className="h-3.5 w-3.5" />
      {d.label}
      <span className="font-normal opacity-70">overall vs {vs}</span>
    </span>
  );
}

function Delta({ cur, prev, vs }: { cur: number; prev: number; vs: string }) {
  const d = deltaInfo(cur, prev);
  const Arrow = d.dir === "up" ? ArrowUp : d.dir === "down" ? ArrowDown : Minus;
  const tone =
    d.dir === "up"
      ? "text-emerald-600"
      : d.dir === "down"
        ? "text-red-600"
        : "text-muted-foreground";
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${tone}`}
      title={`${cur} vs ${prev} ${vs}`}
    >
      <Arrow className="h-3 w-3" />
      {d.label}
      <span className="font-normal text-muted-foreground">vs {vs}</span>
    </span>
  );
}

const METRICS = [
  { key: "calls", label: "Calls", icon: Phone, color: "#2563EB" },
  { key: "emails", label: "Emails", icon: Mail, color: "#7C3AED" },
  { key: "notes", label: "Notes", icon: StickyNote, color: "#6B7280" },
  { key: "spoken", label: "Spoken", icon: Users, color: "#15A34A" },
] as const;

export function UserKpiReport() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [userId, setUserId] = useState<string>("");
  const [period, setPeriod] = useState<KpiPeriod>("monthly");
  const [report, setReport] = useState<Report | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    Promise.all([
      getAgentsList(),
      getLatestActivityAgentId().catch(() => null),
    ])
      .then(([rows, latestId]) => {
        setAgents(rows);
        // Default to the most-recently-active user (latest note), else the first.
        const fallback = rows[0]?.id ?? "";
        const def =
          latestId && rows.some((r) => r.id === latestId) ? latestId : fallback;
        setUserId((cur) => cur || def);
      })
      .catch(() => setAgents([]));
  }, []);

  useEffect(() => {
    if (!userId) return;
    startTransition(async () => {
      try {
        setReport(await getUserKpiReport(userId, period));
      } catch {
        setReport(null);
      }
    });
  }, [userId, period]);

  const fmtBucket = (b: string) =>
    report?.trendUnit === "month"
      ? new Date(`${b}-01T00:00:00`).toLocaleDateString(undefined, { month: "short" })
      : new Date(`${b}T00:00:00`).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        });

  const chartData = useMemo(
    () => (report?.trend ?? []).map((t) => ({ ...t, label: fmtBucket(t.bucket) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [report],
  );

  const selectedUser = agents.find((a) => a.id === userId);
  const selectedName = selectedUser
    ? `${selectedUser.firstName} ${selectedUser.lastName}`
    : "";

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-base">User KPIs</CardTitle>
          <p className="text-xs text-muted-foreground">
            Calls, emails &amp; notes a user logged on leads + enquiries.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select a user" />
            </SelectTrigger>
            <SelectContent>
              {agents.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.firstName} {a.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Tabs value={period} onValueChange={(v) => setPeriod(v as KpiPeriod)}>
            <TabsList>
              {PERIODS.map((p) => (
                <TabsTrigger key={p.value} value={p.value}>
                  {p.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Selected user + overall performance */}
        <div className="flex flex-wrap items-center gap-3 border-b pb-3">
          <span className="text-lg font-semibold text-gray-900">
            {selectedName || "—"}
          </span>
          {report && (
            <OverallBadge
              cur={report.totals.total}
              prev={report.previous.total}
              vs={PREV_LABEL[period]}
            />
          )}
        </div>

        {/* KPI totals for the selected period */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {METRICS.map((m) => {
            const Icon = m.icon;
            const total = report?.totals[m.key] ?? 0;
            const leads = report?.byEntity.leads[m.key] ?? 0;
            const enq = report?.byEntity.enquiries[m.key] ?? 0;
            return (
              <div key={m.key} className="rounded-lg border bg-card p-3">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Icon className="h-4 w-4" style={{ color: m.color }} />
                  {m.label}
                </div>
                <div className="mt-1 text-2xl font-semibold tabular-nums">
                  {pending && !report ? "…" : total}
                </div>
                {report && (
                  <div className="mt-0.5">
                    <Delta
                      cur={total}
                      prev={report.previous[m.key]}
                      vs={PREV_LABEL[period]}
                    />
                  </div>
                )}
                <div className="text-[11px] text-muted-foreground">
                  {leads} leads · {enq} enquiries
                </div>
              </div>
            );
          })}
        </div>

        {/* Activity trend */}
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={28} />
              <Tooltip />
              <Legend />
              <Bar dataKey="calls" stackId="a" fill="#2563EB" name="Calls" />
              <Bar dataKey="emails" stackId="a" fill="#7C3AED" name="Emails" />
              <Bar dataKey="spoken" stackId="a" fill="#15A34A" name="Spoken" />
              <Bar dataKey="notes" stackId="a" fill="#9CA3AF" name="Notes" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Call schedule by nextCallDate */}
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Call schedule (by next call date)
          </div>
          <div className="grid grid-cols-3 gap-3">
            <ScheduleCard
              label="Overdue"
              sub="before today"
              value={report?.callSchedule.previous ?? 0}
              icon={CalendarX}
              tone="text-red-600"
            />
            <ScheduleCard
              label="Today"
              sub="due today"
              value={report?.callSchedule.today ?? 0}
              icon={CalendarCheck}
              tone="text-emerald-600"
            />
            <ScheduleCard
              label="Upcoming"
              sub="future"
              value={report?.callSchedule.future ?? 0}
              icon={CalendarClock}
              tone="text-blue-600"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ScheduleCard({
  label,
  sub,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  sub: string;
  value: number;
  icon: typeof Phone;
  tone: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className={`flex items-center gap-1.5 text-xs font-medium ${tone}`}>
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-[11px] text-muted-foreground">{sub} calls</div>
    </div>
  );
}
