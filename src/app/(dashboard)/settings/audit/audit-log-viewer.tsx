"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ClipboardList,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
} from "lucide-react";
import { getAuditLogs } from "@/lib/actions/audit";

const actionColors: Record<string, string> = {
  CREATE: "bg-emerald-100 text-emerald-700",
  UPDATE: "bg-blue-100 text-blue-700",
  DELETE: "bg-red-100 text-red-700",
  LOGIN: "bg-gray-100 text-gray-700",
  LOGOUT: "bg-gray-100 text-gray-700",
  EXPORT: "bg-purple-100 text-purple-700",
  IMPORT: "bg-indigo-100 text-indigo-700",
  ASSIGN: "bg-orange-100 text-orange-700",
  STAGE_CHANGE: "bg-yellow-100 text-yellow-700",
};

const ACTIONS = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "LOGIN",
  "LOGOUT",
  "EXPORT",
  "IMPORT",
  "ASSIGN",
  "STAGE_CHANGE",
] as const;

const ENTITY_TYPES = [
  "Client",
  "Lead",
  "Deal",
  "Enquiry",
  "Property",
  "Task",
  "Payment",
  "Commission",
  "User",
  "Document",
  "Booking",
  "Campaign",
  "Team",
];

interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  changes: unknown;
  ipAddress: string | null;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface AuditLogViewerProps {
  initialLogs: AuditLogEntry[];
  initialTotal: number;
}

export default function AuditLogViewer({
  initialLogs,
  initialTotal,
}: AuditLogViewerProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>(initialLogs);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [isPending, startTransition] = useTransition();

  // Filters
  const [actionFilter, setActionFilter] = useState<string>("");
  const [entityFilter, setEntityFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const limit = 25;
  const totalPages = Math.ceil(total / limit);

  function fetchLogs(newPage: number) {
    startTransition(async () => {
      try {
        const result = await getAuditLogs({
          action: actionFilter as any || undefined,
          entityType: entityFilter || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          page: newPage,
          limit,
        });
        setLogs(
          result.logs.map((log) => ({
            ...log,
            createdAt: log.createdAt.toISOString(),
          })) as AuditLogEntry[]
        );
        setTotal(result.total);
        setPage(newPage);
      } catch {
        // Ignore errors
      }
    });
  }

  function applyFilters() {
    fetchLogs(1);
  }

  function clearFilters() {
    setActionFilter("");
    setEntityFilter("");
    setSearchQuery("");
    setStartDate("");
    setEndDate("");
    startTransition(async () => {
      try {
        const result = await getAuditLogs({ page: 1, limit });
        setLogs(
          result.logs.map((log) => ({
            ...log,
            createdAt: log.createdAt.toISOString(),
          })) as AuditLogEntry[]
        );
        setTotal(result.total);
        setPage(1);
      } catch {
        // Ignore
      }
    });
  }

  const hasFilters = actionFilter || entityFilter || startDate || endDate;

  // Client-side search filtering on displayed results
  const filteredLogs = searchQuery
    ? logs.filter(
        (log) =>
          log.entityType.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.entityId.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (log.changes && JSON.stringify(log.changes).toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : logs;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
          <ClipboardList className="h-5 w-5 text-gray-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
          <p className="text-gray-500">{total} total events</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="border border-gray-200">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="w-[160px]">
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  {ACTIONS.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-[160px]">
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Entity" />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_TYPES.map((e) => (
                    <SelectItem key={e} value={e}>
                      {e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-[140px]"
                placeholder="From"
              />
            </div>
            <div>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-[140px]"
                placeholder="To"
              />
            </div>
            <Button onClick={applyFilters} size="sm" className="bg-[#dc2626] hover:bg-[#b91c1c] text-white">
              <Filter className="h-4 w-4 mr-1" />
              Filter
            </Button>
            {hasFilters && (
              <Button onClick={clearFilters} variant="outline" size="sm">
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border border-gray-200">
        <CardContent className="p-0">
          {isPending ? (
            <div className="py-12 text-center">
              <p className="text-gray-500">Loading...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-12 text-center">
              <ClipboardList className="mx-auto mb-4 h-12 w-12 text-gray-300" />
              <p className="text-gray-500">No audit events found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-gray-100 bg-gray-50/50">
                  <TableHead className="text-xs font-medium text-gray-500">
                    Time
                  </TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">
                    User
                  </TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">
                    Action
                  </TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">
                    Entity
                  </TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">
                    Details
                  </TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">
                    IP
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow
                    key={log.id}
                    className="border-b border-gray-50 hover:bg-gray-50/50"
                  >
                    <TableCell className="text-xs text-gray-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      <div>
                        {log.user.firstName} {log.user.lastName}
                      </div>
                      <div className="text-xs text-gray-400">
                        {log.user.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          actionColors[log.action] ||
                          "bg-gray-100 text-gray-700"
                        }
                      >
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      <span className="font-medium">{log.entityType}</span>
                      <span className="text-gray-400 text-xs ml-1">
                        #{log.entityId.slice(0, 8)}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-gray-500 max-w-[250px]">
                      {log.changes ? (
                        <code className="bg-gray-50 px-1.5 py-0.5 rounded text-[11px] block truncate">
                          {JSON.stringify(log.changes).slice(0, 120)}
                        </code>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-gray-400">
                      {log.ipAddress || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {(page - 1) * limit + 1}–
            {Math.min(page * limit, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || isPending}
              onClick={() => fetchLogs(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || isPending}
              onClick={() => fetchLogs(page + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
