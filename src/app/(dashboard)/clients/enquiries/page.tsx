import { Suspense } from "react";
import Link from "next/link";
import {
  getEnquiries,
  getEnquiriesByStatus,
  getAgents,
  getActiveProperties,
} from "@/lib/actions/enquiries";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, LayoutGrid, List } from "lucide-react";
import { EnquiriesTable } from "./enquiries-table";
import { EnquiryKanban } from "./enquiry-kanban";
import { AddEnquiryDialog } from "./add-enquiry-dialog";
import { ImportLeads } from "./import-leads";
import type { EnquiryStatus, EnquirySource } from "@prisma/client";

const TAGS = [
  "Cash Buyer",
  "First-time Buyer",
  "Investor",
  "Multiple Properties",
  "Pre-approved",
  "Relocating",
];

const TABS = [
  { key: "48h", label: "Last 48 Hours" },
  { key: "today", label: "Today call list" },
  { key: "previous", label: "Previous next call" },
  { key: "future", label: "Future next call" },
  { key: "new", label: "New lead" },
  { key: "tagged", label: "Tagged" },
  { key: "all", label: "All" },
];

interface PageProps {
  searchParams: Promise<{
    status?: EnquiryStatus;
    source?: EnquirySource;
    agent?: string;
    page?: string;
    tab?: string;
    tag?: string;
    search?: string;
    view?: string;
  }>;
}

async function EnquiriesTableWrapper({
  searchParams,
}: {
  searchParams: PageProps["searchParams"];
}) {
  const params = await searchParams;
  const [
    { enquiries, total, pages, currentPage, futureCallCount },
    agents,
    properties,
  ] = await Promise.all([
    getEnquiries({
      status: params.status,
      source: params.source,
      agentId: params.agent,
      page: params.page ? parseInt(params.page) : 1,
      tab: params.tab || "all",
      tag: params.tag,
      search: params.search,
    }),
    getAgents(),
    getActiveProperties(),
  ]);

  // Serialize dates for client component
  const serialized = enquiries.map((e) => ({
    ...e,
    createdAt: e.createdAt.toISOString(),
    updatedAt: undefined,
    nextCallDate: e.nextCallDate ? e.nextCallDate.toISOString() : null,
    notes:
      (e as any).notes?.map((n: any) => ({
        ...n,
        createdAt: n.createdAt.toISOString(),
      })) || [],
  }));

  return (
    <EnquiriesTable
      enquiries={serialized as never}
      agents={agents}
      properties={properties}
      total={total}
      pages={pages}
      currentPage={currentPage}
    />
  );
}

function EnquiriesTableSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-14 w-full" />
        </div>
      ))}
    </div>
  );
}

export default async function EnquiriesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const activeTab = params.tab || "all";
  const activeTag = params.tag || "";
  const activeView = params.view || "table";
  const [agents, properties, { futureCallCount }] = await Promise.all([
    getAgents(),
    getActiveProperties(),
    getEnquiries({ tab: "future", limit: 1 }),
  ]);

  // Build URL helper
  function buildUrl(overrides: Record<string, string | undefined>) {
    const base: Record<string, string> = {};
    if (params.status) base.status = params.status;
    if (params.source) base.source = params.source;
    if (params.agent) base.agent = params.agent;
    if (params.search) base.search = params.search;
    if (params.view && params.view !== "table") base.view = params.view;
    const merged = { ...base, ...overrides };
    // Remove undefined/empty values
    const filtered = Object.fromEntries(
      Object.entries(merged).filter(([, v]) => v),
    );
    const qs = new URLSearchParams(
      filtered as Record<string, string>,
    ).toString();
    return `/clients/enquiries${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Enquiries</h1>
          <p className="text-gray-500">
            Manage and track all property enquiries and leads
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex rounded-lg border border-gray-200 bg-white">
            <Link
              href={buildUrl({
                view: "board",
                tab: activeTab !== "all" ? activeTab : undefined,
                tag: activeTag || undefined,
              })}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-l-lg transition-colors ${
                activeView === "board"
                  ? "bg-[#dc2626] text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
              Board
            </Link>
            <Link
              href={buildUrl({
                view: undefined,
                tab: activeTab !== "all" ? activeTab : undefined,
                tag: activeTag || undefined,
              })}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-r-lg transition-colors ${
                activeView === "table"
                  ? "bg-[#dc2626] text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <List className="h-4 w-4" />
              Table
            </Link>
          </div>
          <ImportLeads />
          <AddEnquiryDialog agents={agents} properties={properties} />
        </div>
      </div>

      {/* Search Bar */}
      <form action="/clients/enquiries" method="get">
        {activeTab !== "all" && (
          <input type="hidden" name="tab" value={activeTab} />
        )}
        {activeTag && <input type="hidden" name="tag" value={activeTag} />}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            name="search"
            defaultValue={params.search || ""}
            placeholder="Search by name, email, or phone..."
            className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-[#dc2626] focus:outline-none focus:ring-1 focus:ring-[#dc2626]"
          />
        </div>
      </form>

      {/* Tags Row */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-gray-500">Tags:</span>
        {TAGS.map((tag) => (
          <Link
            key={tag}
            href={buildUrl({
              tag: activeTag === tag ? undefined : tag,
              tab: activeTab !== "all" ? activeTab : undefined,
            })}
          >
            <button
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                activeTag === tag
                  ? "border-[#dc2626] bg-[#dc2626] text-white"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {tag}
            </button>
          </Link>
        ))}
        {activeTag && !TAGS.includes(activeTag) && (
          <Link
            href={buildUrl({
              tag: undefined,
              tab: activeTab !== "all" ? activeTab : undefined,
            })}
          >
            <button className="rounded-full border border-[#dc2626] bg-[#dc2626] px-3 py-1 text-xs font-medium text-white">
              {activeTag} &times;
            </button>
          </Link>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 overflow-x-auto">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={buildUrl({
              tab: tab.key === "all" ? undefined : tab.key,
              page: undefined,
              tag: activeTag || undefined,
            })}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-[#dc2626] text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {tab.label}
            {tab.key === "future" && futureCallCount > 0 && (
              <span className="ml-1.5 rounded-full bg-white/20 px-1.5 py-0.5 text-xs">
                {futureCallCount}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* Content - Board or Table */}
      {activeView === "board" ? (
        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
          <KanbanWrapper />
        </Suspense>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white">
          <Suspense fallback={<EnquiriesTableSkeleton />}>
            <EnquiriesTableWrapper searchParams={searchParams} />
          </Suspense>
        </div>
      )}
    </div>
  );
}

async function KanbanWrapper() {
  const statusData = await getEnquiriesByStatus();
  // Serialize dates for client component
  const serialized: Record<
    string,
    Array<{
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      status: string;
      source: string;
      budget: string | null;
      country: string | null;
      priority: string | null;
      tags: string[];
      createdAt: string;
      assignedAgent: { id: string; firstName: string; lastName: string } | null;
      interestedProperty: { id: string; name: string } | null;
    }>
  > = {};
  for (const [status, enquiries] of Object.entries(statusData)) {
    serialized[status] = enquiries.map((e: Record<string, unknown>) => ({
      id: e.id as string,
      firstName: e.firstName as string,
      lastName: e.lastName as string,
      email: e.email as string,
      phone: e.phone as string,
      status: String(e.status),
      source: String(e.source),
      budget: (e.budget as string | null) ?? null,
      country: (e.country as string | null) ?? null,
      priority: (e.priority as string | null) ?? null,
      tags: (e.tags as string[]) ?? [],
      createdAt: (e.createdAt as Date).toISOString(),
      assignedAgent:
        (e.assignedAgent as {
          id: string;
          firstName: string;
          lastName: string;
        } | null) ?? null,
      interestedProperty:
        (e.interestedProperty as { id: string; name: string } | null) ?? null,
    }));
  }
  return <EnquiryKanban initialData={serialized} />;
}
