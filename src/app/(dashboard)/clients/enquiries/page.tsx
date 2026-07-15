import { Suspense } from "react";
import Link from "next/link";
import { auth, type ExtendedSession } from "@/lib/auth";
import {
  getEnquiries,
  getEnquiriesByStatus,
  getAgents,
  getActiveProperties,
  getEnquiryCountsByConsultant,
} from "@/lib/actions/enquiries";
import { getPoolsForUser } from "@/lib/actions/crm-settings";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, LayoutGrid, List } from "lucide-react";
import { EnquiriesTable } from "./enquiries-table";
import { EnquiryKanban } from "./enquiry-kanban";
import { AddEnquiryDialog } from "./add-enquiry-dialog";
import { ImportLeads } from "./import-leads";
import { FilterBar } from "@/components/shared/filter-bar";
import { PriorityFilter } from "@/components/shared/priority-filter";
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

const ENQUIRY_STATUS_OPTIONS = [
  { value: "NEW", label: "New" },
  { value: "ASSIGNED", label: "Assigned" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "CONVERTED_TO_CLIENT", label: "Converted" },
  { value: "SPAM", label: "Spam" },
  { value: "CLOSED", label: "Closed" },
];

const ENQUIRY_BUDGET_OPTIONS = [
  { value: "Under 100K", label: "Under $100K" },
  { value: "100K-250K", label: "$100K–$250K" },
  { value: "250K-500K", label: "$250K–$500K" },
  { value: "500K-1M", label: "$500K–$1M" },
  { value: "1M+", label: "Over $1M" },
];

const ENQUIRY_SOURCE_OPTIONS = [
  { value: "WEBSITE_FORM", label: "Website Form" },
  { value: "PHONE_CALL", label: "Phone Call" },
  { value: "EMAIL", label: "Email" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "LIVE_CHAT", label: "Live Chat" },
  { value: "PARTNER_REFERRAL", label: "Partner Referral" },
  { value: "FACEBOOK_ADS", label: "Facebook / Meta" },
];

const SEGMENT_OPTIONS = [
  { value: "Buyer", label: "Buyer" },
  { value: "Seller", label: "Seller" },
  { value: "Investor", label: "Investor" },
  { value: "Developer", label: "Developer" },
  { value: "Tenant", label: "Tenant" },
];

const COUNTRY_OPTIONS = [
  { value: "UAE", label: "UAE" },
  { value: "UK", label: "UK" },
  { value: "USA", label: "USA" },
  { value: "India", label: "India" },
  { value: "Pakistan", label: "Pakistan" },
  { value: "Russia", label: "Russia" },
  { value: "China", label: "China" },
  { value: "Germany", label: "Germany" },
  { value: "France", label: "France" },
  { value: "Canada", label: "Canada" },
  { value: "Australia", label: "Australia" },
  { value: "Saudi Arabia", label: "Saudi Arabia" },
  { value: "Kuwait", label: "Kuwait" },
  { value: "Qatar", label: "Qatar" },
  { value: "Bahrain", label: "Bahrain" },
  { value: "Oman", label: "Oman" },
  { value: "Egypt", label: "Egypt" },
  { value: "Jordan", label: "Jordan" },
  { value: "Lebanon", label: "Lebanon" },
  { value: "Nigeria", label: "Nigeria" },
  { value: "South Africa", label: "South Africa" },
];

const ENQUIRY_FILTER_SELECTS = [
  { key: "status", label: "By Status", options: ENQUIRY_STATUS_OPTIONS },
  { key: "budget", label: "By Budgets", options: ENQUIRY_BUDGET_OPTIONS },
  { key: "clientTag", label: "Client Tags", options: TAGS.map((t) => ({ value: t, label: t })) },
  { key: "country", label: "Country Origin", options: COUNTRY_OPTIONS },
  { key: "tag", label: "By Tag", options: TAGS.map((t) => ({ value: t, label: t })) },
  { key: "source", label: "By Source", options: ENQUIRY_SOURCE_OPTIONS },
  { key: "segment", label: "By Segment", options: SEGMENT_OPTIONS },
];

const ENQUIRY_FILTER_INPUTS = [
  { key: "projectName", placeholder: "Project Name" },
  { key: "clientName", placeholder: "Client Name" },
  { key: "clientPhone", placeholder: "Client Phone" },
  { key: "nextCallDate", placeholder: "Next Call", type: "date" },
  { key: "clientEmail", placeholder: "Client Email" },
  { key: "clientId", placeholder: "Client ID" },
];

interface PageProps {
  searchParams: Promise<{
    status?: EnquiryStatus;
    source?: EnquirySource;
    agent?: string;
    consultant?: string;
    page?: string;
    tab?: string;
    tag?: string;
    search?: string;
    view?: string;
    budget?: string;
    segment?: string;
    country?: string;
    clientTag?: string;
    projectName?: string;
    clientName?: string;
    clientPhone?: string;
    nextCallDate?: string;
    clientEmail?: string;
    clientId?: string;
    priority?: string;
    pageSize?: string;
  }>;
}

async function EnquiriesTableWrapper({
  searchParams,
  userRole,
  pools,
}: {
  searchParams: PageProps["searchParams"];
  userRole: string;
  pools: { tag: string; name: string }[];
}) {
  const params = await searchParams;
  const pageSize = params.pageSize ? parseInt(params.pageSize) : 10;
  const [
    { enquiries, total, pages, currentPage, futureCallCount },
    agents,
    properties,
  ] = await Promise.all([
    getEnquiries({
      status: params.status,
      source: params.source,
      agentId: params.consultant || params.agent,
      page: params.page ? parseInt(params.page) : 1,
      limit: pageSize,
      tab: params.tab || "all",
      tag: params.tag,
      search: params.search,
      budget: params.budget,
      segment: params.segment,
      country: params.country,
      clientTag: params.clientTag,
      projectName: params.projectName,
      clientName: params.clientName,
      clientPhone: params.clientPhone,
      nextCallDate: params.nextCallDate,
      clientEmail: params.clientEmail,
      clientId: params.clientId,
      priority: params.priority,
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
      pools={pools}
      total={total}
      pages={pages}
      currentPage={currentPage}
      pageSize={pageSize}
      userRole={userRole}
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
  const session = (await auth()) as ExtendedSession | null;
  const userRole = session?.user?.role || "VIEWER";
  const params = await searchParams;
  const activeTab = params.tab || "all";
  const activeTag = params.tag || "";
  const activeView = params.view || "table";
  const activeConsultant = params.consultant || "";
  const [agents, properties, { futureCallCount, previousCallCount }, consultantCounts, pools] = await Promise.all([
    getAgents(),
    getActiveProperties(),
    getEnquiries({ tab: "future", limit: 1 }),
    getEnquiryCountsByConsultant(),
    session?.user ? getPoolsForUser(session.user.id) : Promise.resolve([]),
  ]);

  // Build URL helper
  function buildUrl(overrides: Record<string, string | undefined>) {
    const base: Record<string, string> = {};
    if (params.status) base.status = params.status;
    if (params.source) base.source = params.source;
    if (params.agent) base.agent = params.agent;
    if (params.consultant) base.consultant = params.consultant;
    if (params.search) base.search = params.search;
    if (params.view && params.view !== "table") base.view = params.view;
    // Preserve filter bar params
    if (params.tag) base.tag = params.tag;
    if (params.budget) base.budget = params.budget;
    if (params.segment) base.segment = params.segment;
    if (params.country) base.country = params.country;
    if (params.clientTag) base.clientTag = params.clientTag;
    if (params.projectName) base.projectName = params.projectName;
    if (params.clientName) base.clientName = params.clientName;
    if (params.clientPhone) base.clientPhone = params.clientPhone;
    if (params.nextCallDate) base.nextCallDate = params.nextCallDate;
    if (params.clientEmail) base.clientEmail = params.clientEmail;
    if (params.clientId) base.clientId = params.clientId;
    if (params.priority) base.priority = params.priority;
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
          <AddEnquiryDialog agents={agents} properties={properties} pools={pools} />
        </div>
      </div>

      {/* Search Bar */}
      <form action="/clients/enquiries" method="get">
        {activeTab !== "all" && (
          <input type="hidden" name="tab" value={activeTab} />
        )}
        {activeConsultant && <input type="hidden" name="consultant" value={activeConsultant} />}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            name="search"
            defaultValue={params.search || ""}
            placeholder="Search by ref ID, name, email, or phone..."
            className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-[#dc2626] focus:outline-none focus:ring-1 focus:ring-[#dc2626]"
          />
        </div>
      </form>

      {/* Filter Bar */}
      <FilterBar
        selects={ENQUIRY_FILTER_SELECTS}
        textInputs={ENQUIRY_FILTER_INPUTS}
        preserveParams={["tab", "view", "search", "consultant", "priority"]}
      />

      {/* Consultant Filter - SUPER_ADMIN only */}
      {userRole === "SUPER_ADMIN" && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-500">Consultant:</span>
          {[
            { key: "", label: "All", count: 0 },
            { key: "unassigned", label: "Unassigned", count: consultantCounts.unassigned },
            ...consultantCounts.poolCounts.map((p) => ({
              key: p.tag,
              label: p.name,
              count: p.count,
            })),
            ...agents.map((a) => ({
              key: a.id,
              label: `${a.firstName} ${a.lastName}`,
              count: consultantCounts.byAgent[a.id] || 0,
            })),
          ].filter((item) => item.key === "" || item.key === "unassigned" || item.count > 0).map((item) => (
            <Link
              key={item.key || "all"}
              href={buildUrl({
                consultant: item.key || undefined,
                tab: activeTab !== "all" ? activeTab : undefined,
                tag: activeTag || undefined,
                page: undefined,
              })}
            >
              <button
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  activeConsultant === item.key
                    ? "border-[#dc2626] bg-[#dc2626] text-white"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {item.label}
                {item.count > 0 && (
                  <span className={`ml-1 ${
                    activeConsultant === item.key
                      ? "text-white/80"
                      : "text-gray-400"
                  }`}>
                    ({item.count})
                  </span>
                )}
              </button>
            </Link>
          ))}
        </div>
      )}

      {/* Tab Navigation + Priority Filter */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
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
              {tab.key === "previous" && previousCallCount > 0 && (
                <span className="ml-1.5 rounded-full bg-white/20 px-1.5 py-0.5 text-xs">
                  {previousCallCount}
                </span>
              )}
            </Link>
          ))}
        </div>
        <PriorityFilter />
      </div>

      {/* Content - Board or Table */}
      {activeView === "board" ? (
        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
          <KanbanWrapper />
        </Suspense>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white">
          <Suspense fallback={<EnquiriesTableSkeleton />}>
            <EnquiriesTableWrapper
              searchParams={searchParams}
              userRole={userRole}
              pools={pools}
            />
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
