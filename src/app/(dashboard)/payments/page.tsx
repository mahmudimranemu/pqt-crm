import { auth, type ExtendedSession } from "@/lib/auth";
import { getPayments } from "@/lib/actions/payments";
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
import { CreditCard, DollarSign } from "lucide-react";
import Link from "next/link";

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  RECEIVED: "bg-emerald-100 text-emerald-700",
  OVERDUE: "bg-red-100 text-red-700",
  REFUNDED: "bg-gray-100 text-gray-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

export default async function PaymentsPage() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) return null;

  const { payments, total } = await getPayments({ limit: 50 });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
          <CreditCard className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-500">{total} total payments</p>
        </div>
      </div>

      <Card className="border border-gray-200">
        <CardContent className="p-0">
          {payments.length === 0 ? (
            <div className="py-12 text-center">
              <DollarSign className="mx-auto mb-4 h-12 w-12 text-gray-300" />
              <p className="text-gray-500">No payments recorded yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-gray-100 bg-gray-50/50">
                  <TableHead className="text-xs font-medium text-gray-500">Deal</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">Client</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">Amount</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">Status</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">Method</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">Due Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <TableCell>
                      <Link href={`/deals/${payment.deal.id}`} className="text-sm font-medium text-[#dc2626] hover:underline">
                        {payment.deal.dealNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {payment.client.firstName} {payment.client.lastName}
                    </TableCell>
                    <TableCell className="text-sm font-medium text-gray-900">
                      ${Number(payment.amount).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[payment.status]}>
                        {payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {payment.method?.replace(/_/g, " ") || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {payment.dueDate ? new Date(payment.dueDate).toLocaleDateString() : "—"}
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
