import { Suspense } from "react";
import Link from "next/link";
import { getClients, getAgentsForAssignment } from "@/lib/actions/clients";
import { Button } from "@/components/ui/button";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Filter } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ClientFilters } from "./client-filters";
import type { ClientStatus, LeadSource } from "@prisma/client";

const statusColors: Record<ClientStatus, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  NEW_LEAD: "secondary",
  CONTACTED: "default",
  QUALIFIED: "default",
  VIEWING_SCHEDULED: "warning",
  VIEWED: "warning",
  NEGOTIATING: "warning",
  DEAL_CLOSED: "success",
  LOST: "destructive",
  INACTIVE: "outline" as "default",
};

const statusLabels: Record<ClientStatus, string> = {
  NEW_LEAD: "New Lead",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  VIEWING_SCHEDULED: "Viewing Scheduled",
  VIEWED: "Viewed",
  NEGOTIATING: "Negotiating",
  DEAL_CLOSED: "Deal Closed",
  LOST: "Lost",
  INACTIVE: "Inactive",
};

interface PageProps {
  searchParams: Promise<{
    search?: string;
    status?: ClientStatus;
    agent?: string;
    source?: LeadSource;
    page?: string;
  }>;
}

async function ClientsTable({ searchParams }: { searchParams: PageProps["searchParams"] }) {
  const params = await searchParams;
  const { clients, total, pages, currentPage } = await getClients({
    search: params.search,
    status: params.status,
    agentId: params.agent,
    source: params.source,
    page: params.page ? parseInt(params.page) : 1,
  });

  if (clients.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No clients found.</p>
        <Link href="/clients/create">
          <Button className="mt-4">
            <Plus className="mr-2 h-4 w-4" />
            Add Your First Client
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Nationality</TableHead>
            <TableHead>Budget</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Agent</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => (
            <TableRow key={client.id}>
              <TableCell>
                <Link
                  href={`/clients/${client.id}`}
                  className="font-medium text-gray-900 hover:underline"
                >
                  {client.firstName} {client.lastName}
                </Link>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  <div>{client.email}</div>
                  <div className="text-muted-foreground">{client.phone}</div>
                </div>
              </TableCell>
              <TableCell>{client.nationality}</TableCell>
              <TableCell>
                <span className="text-sm">
                  {formatCurrency(Number(client.budgetMin))} -{" "}
                  {formatCurrency(Number(client.budgetMax))}
                </span>
              </TableCell>
              <TableCell>
                <Badge variant={statusColors[client.status]}>
                  {statusLabels[client.status]}
                </Badge>
              </TableCell>
              <TableCell>
                {client.assignedAgent ? (
                  <span className="text-sm">
                    {client.assignedAgent.firstName} {client.assignedAgent.lastName}
                  </span>
                ) : (
                  <span className="text-muted-foreground text-sm">Unassigned</span>
                )}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDate(client.createdAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between px-2 py-4">
          <p className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * 25 + 1} to{" "}
            {Math.min(currentPage * 25, total)} of {total} clients
          </p>
          <div className="flex gap-2">
            {currentPage > 1 && (
              <Link
                href={`/clients?page=${currentPage - 1}${params.search ? `&search=${params.search}` : ""}${params.status ? `&status=${params.status}` : ""}`}
              >
                <Button variant="outline" size="sm">
                  Previous
                </Button>
              </Link>
            )}
            {currentPage < pages && (
              <Link
                href={`/clients?page=${currentPage + 1}${params.search ? `&search=${params.search}` : ""}${params.status ? `&status=${params.status}` : ""}`}
              >
                <Button variant="outline" size="sm">
                  Next
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function ClientsTableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-12 w-full" />
        </div>
      ))}
    </div>
  );
}

export default async function ClientsPage({ searchParams }: PageProps) {
  const agents = await getAgentsForAssignment();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-muted-foreground">
            Manage your client database and track their journey
          </p>
        </div>
        <Link href="/clients/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Client
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <ClientFilters agents={agents} />

      {/* Clients Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Clients</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<ClientsTableSkeleton />}>
            <ClientsTable searchParams={searchParams} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
