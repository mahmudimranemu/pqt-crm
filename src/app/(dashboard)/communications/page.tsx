import { Suspense } from "react";
import { auth, type ExtendedSession } from "@/lib/auth";
import { getCallLogs, getCallStats, getAgentsList } from "@/lib/actions/communications";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Clock,
  CheckCircle,
  ShieldAlert,
} from "lucide-react";
import type { CallOutcome } from "@prisma/client";
import { LogCallDialog } from "./log-call-dialog";
import { AgentFilter } from "./agent-filter";
import Link from "next/link";

const outcomeColors: Record<
  CallOutcome,
  "default" | "secondary" | "success" | "warning" | "destructive"
> = {
  CONNECTED: "success",
  VOICEMAIL: "warning",
  NO_ANSWER: "secondary",
  BUSY: "warning",
  WRONG_NUMBER: "destructive",
};

const outcomeLabels: Record<CallOutcome, string> = {
  CONNECTED: "Connected",
  VOICEMAIL: "Voicemail",
  NO_ANSWER: "No Answer",
  BUSY: "Busy",
  WRONG_NUMBER: "Wrong Number",
};

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

interface PageProps {
  searchParams: Promise<{
    agentId?: string;
  }>;
}

export default async function CommunicationsPage({ searchParams }: PageProps) {
  const session = (await auth()) as ExtendedSession | null;

  // Role check: only SUPER_ADMIN and ADMIN can access this page
  if (
    !session?.user?.role ||
    !["SUPER_ADMIN", "ADMIN"].includes(session.user.role)
  ) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="border border-gray-200 max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mx-auto mb-4">
              <ShieldAlert className="h-6 w-6 text-[#dc2626]" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Access Denied
            </h2>
            <p className="text-sm text-gray-500">
              You don&apos;t have permission to access this page. Only
              administrators can view communications.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const params = await searchParams;
  const agentId = params.agentId || undefined;

  const [{ calls, total }, stats, agents] = await Promise.all([
    getCallLogs({ agentId }),
    getCallStats(),
    getAgentsList(),
  ]);

  const statCards = [
    {
      title: "Today's Calls",
      value: stats.todayCalls,
      icon: Phone,
      description: `${stats.weekCalls} this week`,
    },
    {
      title: "This Month",
      value: stats.monthCalls,
      icon: Clock,
      description: `${stats.totalCalls} total`,
    },
    {
      title: "Connection Rate",
      value: `${stats.connectionRate.toFixed(0)}%`,
      icon: CheckCircle,
      description: `${stats.connectedCalls} connected`,
    },
    {
      title: "Avg Duration",
      value: formatDuration(Math.round(stats.avgDuration)),
      icon: Clock,
      description: "Per call",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Communications</h1>
          <p className="text-muted-foreground">
            Track calls and client communications
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Suspense fallback={null}>
            <AgentFilter agents={agents} />
          </Suspense>
          <LogCallDialog />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {stat.value}
              </div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Calls ({total})</CardTitle>
            {agentId && (
              <Badge variant="secondary" className="text-xs">
                Filtered by agent
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {calls.length === 0 ? (
            <div className="text-center py-12">
              <Phone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {agentId
                  ? "No calls found for this agent."
                  : "No calls logged yet."}
              </p>
              <LogCallDialog />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calls.map((call) => (
                  <TableRow key={call.id}>
                    <TableCell>
                      {new Date(call.callDate).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {call.callType === "OUTBOUND" ? (
                          <PhoneOutgoing className="h-4 w-4 text-blue-500" />
                        ) : (
                          <PhoneIncoming className="h-4 w-4 text-green-500" />
                        )}
                        {call.callType}
                      </div>
                    </TableCell>
                    <TableCell>
                      {call.client ? (
                        <Link
                          href={`/clients/${call.client.id}`}
                          className="text-gray-900 hover:underline"
                        >
                          {call.client.firstName} {call.client.lastName}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {call.agent.firstName} {call.agent.lastName}
                    </TableCell>
                    <TableCell>{formatDuration(call.duration)}</TableCell>
                    <TableCell>
                      <Badge variant={outcomeColors[call.outcome]}>
                        {outcomeLabels[call.outcome]}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {call.notes || "-"}
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
