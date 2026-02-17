import { Suspense } from "react";
import Link from "next/link";
import { auth, type ExtendedSession } from "@/lib/auth";
import { getClients, getAgentsForAssignment } from "@/lib/actions/clients";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import { ClientFilters } from "./client-filters";
import { ClientsTableContent } from "./clients-table";
import type { ClientStatus, LeadSource } from "@prisma/client";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    status?: ClientStatus;
    agent?: string;
    source?: LeadSource;
    page?: string;
  }>;
}

async function ClientsTableWrapper({
  searchParams,
  userRole,
}: {
  searchParams: PageProps["searchParams"];
  userRole: string;
}) {
  const params = await searchParams;
  const { clients, total, pages, currentPage } = await getClients({
    search: params.search,
    status: params.status,
    agentId: params.agent,
    source: params.source,
    page: params.page ? parseInt(params.page) : 1,
  });

  return (
    <ClientsTableContent
      clients={clients}
      total={total}
      pages={pages}
      currentPage={currentPage}
      searchParams={{
        search: params.search,
        status: params.status,
        agent: params.agent,
        source: params.source,
      }}
      userRole={userRole}
    />
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
  const session = (await auth()) as ExtendedSession | null;
  const agents = await getAgentsForAssignment();
  const userRole = session?.user?.role || "VIEWER";

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
        {session?.user?.role !== "VIEWER" && (
          <Link href="/clients/create">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Client
            </Button>
          </Link>
        )}
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
            <ClientsTableWrapper
              searchParams={searchParams}
              userRole={userRole}
            />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
