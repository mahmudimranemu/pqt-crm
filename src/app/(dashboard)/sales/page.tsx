import Link from "next/link";
import { getSales, getSalesStats } from "@/lib/actions/sales";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, DollarSign, TrendingUp, CheckCircle, Clock } from "lucide-react";
import type { SaleStatus } from "@prisma/client";

const statusColors: Record<SaleStatus, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  PENDING_DEPOSIT: "warning",
  DEPOSIT_RECEIVED: "default",
  CONTRACT_SIGNED: "secondary",
  TITLE_DEED_TRANSFER: "default",
  COMPLETED: "success",
  CANCELLED: "destructive",
};

const statusLabels: Record<SaleStatus, string> = {
  PENDING_DEPOSIT: "Pending Deposit",
  DEPOSIT_RECEIVED: "Deposit Received",
  CONTRACT_SIGNED: "Contract Signed",
  TITLE_DEED_TRANSFER: "Title Deed Transfer",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function SalesPage() {
  const [{ sales, total }, stats] = await Promise.all([
    getSales(),
    getSalesStats(),
  ]);

  const statCards = [
    {
      title: "Total Sales",
      value: stats.totalSales,
      icon: CheckCircle,
      description: "All time",
    },
    {
      title: "This Month",
      value: stats.thisMonthSales,
      icon: TrendingUp,
      description: `vs ${stats.lastMonthSales} last month`,
    },
    {
      title: "Total Revenue",
      value: formatCurrency(stats.totalRevenue),
      icon: DollarSign,
      description: "All time sales value",
    },
    {
      title: "Pending",
      value: stats.pendingSales,
      icon: Clock,
      description: "Awaiting completion",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales</h1>
          <p className="text-muted-foreground">
            Manage property sales and track revenue
          </p>
        </div>
        <Link href="/sales/create">
          <Button className="bg-[#dc2626] hover:bg-[#dc2626]/90">
            <Plus className="h-4 w-4 mr-2" />
            Record Sale
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
          <CardTitle>Recent Sales ({total})</CardTitle>
        </CardHeader>
        <CardContent>
          {sales.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No sales recorded yet.</p>
              <Link href="/sales/create">
                <Button variant="outline" className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Record First Sale
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Sale Price</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>
                      <Link
                        href={`/clients/${sale.client.id}`}
                        className="text-gray-900 hover:underline font-medium"
                      >
                        {sale.client.firstName} {sale.client.lastName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/properties/${sale.property.id}`}
                        className="text-gray-900 hover:underline"
                      >
                        {sale.property.name}
                      </Link>
                      <br />
                      <span className="text-xs text-muted-foreground">
                        {sale.property.pqtNumber}
                        {sale.unitNumber && ` - Unit ${sale.unitNumber}`}
                      </span>
                    </TableCell>
                    <TableCell>
                      {sale.agent.firstName} {sale.agent.lastName}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(Number(sale.salePrice), sale.currency)}
                    </TableCell>
                    <TableCell>
                      {sale.commissionAmount
                        ? formatCurrency(Number(sale.commissionAmount), sale.currency)
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColors[sale.status]}>
                        {statusLabels[sale.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/sales/${sale.id}`}
                        className="text-[#dc2626] hover:underline"
                      >
                        {new Date(sale.createdAt).toLocaleDateString()}
                      </Link>
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
