import { getCallLogs, getCallStats } from "@/lib/actions/communications";
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
  XCircle,
} from "lucide-react";
import type { CallType, CallOutcome } from "@prisma/client";
import { LogCallDialog } from "./log-call-dialog";
import Link from "next/link";

const outcomeColors: Record<CallOutcome, "default" | "secondary" | "success" | "warning" | "destructive"> = {
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

export default async function CommunicationsPage() {
  const [{ calls, total }, stats] = await Promise.all([
    getCallLogs(),
    getCallStats(),
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
        <LogCallDialog />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Calls ({total})</CardTitle>
        </CardHeader>
        <CardContent>
          {calls.length === 0 ? (
            <div className="text-center py-12">
              <Phone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No calls logged yet.</p>
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
