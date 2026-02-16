import { auth, type ExtendedSession } from "@/lib/auth";
import { getCommissions, getAgentCommissionSummary } from "@/lib/actions/commissions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Percent, DollarSign, Clock, CheckCircle } from "lucide-react";
import Link from "next/link";

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-blue-100 text-blue-700",
  PAID: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

export default async function CommissionsPage() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) return null;

  const [{ commissions, total }, summary] = await Promise.all([
    getCommissions({ limit: 50 }),
    getAgentCommissionSummary(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
          <Percent className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Commissions</h1>
          <p className="text-gray-500">Track and manage agent commissions</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border border-gray-200">
          <CardContent className="p-5">
            <p className="text-sm text-gray-500">Pending</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">${summary.pending.amount.toLocaleString()}</p>
            <p className="text-xs text-gray-500">{summary.pending.count} commissions</p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200">
          <CardContent className="p-5">
            <p className="text-sm text-gray-500">Approved</p>
            <p className="mt-1 text-2xl font-bold text-blue-600">${summary.approved.amount.toLocaleString()}</p>
            <p className="text-xs text-gray-500">{summary.approved.count} commissions</p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200">
          <CardContent className="p-5">
            <p className="text-sm text-gray-500">Paid</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">${summary.paid.amount.toLocaleString()}</p>
            <p className="text-xs text-gray-500">{summary.paid.count} commissions</p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200">
          <CardContent className="p-5">
            <p className="text-sm text-gray-500">Total Earned</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">${summary.total.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-gray-200">
        <CardContent className="p-0">
          {commissions.length === 0 ? (
            <div className="py-12 text-center">
              <Percent className="mx-auto mb-4 h-12 w-12 text-gray-300" />
              <p className="text-gray-500">No commissions yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-gray-100 bg-gray-50/50">
                  <TableHead className="text-xs font-medium text-gray-500">Deal</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">Agent</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">Amount</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">Rate</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">Status</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">Paid At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions.map((c) => (
                  <TableRow key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <TableCell>
                      <Link href={`/deals/${c.deal.id}`} className="text-sm font-medium text-[#dc2626] hover:underline">
                        {c.deal.dealNumber}
                      </Link>
                      <p className="text-xs text-gray-500">{c.deal.title}</p>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {c.agent.firstName} {c.agent.lastName}
                    </TableCell>
                    <TableCell className="text-sm font-medium text-gray-900">
                      ${Number(c.amount).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {c.percentage ? `${Number(c.percentage)}%` : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[c.status]}>{c.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {c.paidAt ? new Date(c.paidAt).toLocaleDateString() : "—"}
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
