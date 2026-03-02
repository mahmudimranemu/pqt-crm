import { Suspense } from "react";
import Link from "next/link";
import { auth, type ExtendedSession } from "@/lib/auth";
import {
  getLeads,
  getLeadsByStage,
  getLeadStats,
  getAgentsForLeads,
} from "@/lib/actions/leads";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Target,
  Plus,
  TrendingUp,
  Users,
  Zap,
  Search,
  LayoutGrid,
  List,
} from "lucide-react";
import { LeadKanban } from "./lead-kanban";
import { LeadsTable } from "./leads-table";
import { FilterBar } from "@/components/shared/filter-bar";
import type { LeadStage, BudgetRange, LeadSource } from "@prisma/client";

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

const LEAD_STAGE_OPTIONS = [
  { value: "NEW_ENQUIRY", label: "New Enquiry" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "QUALIFIED", label: "Qualified" },
  { value: "VIEWING_ARRANGED", label: "Viewing Arranged" },
  { value: "VIEWED", label: "Viewed" },
  { value: "OFFER_MADE", label: "Offer Made" },
  { value: "NEGOTIATING", label: "Negotiating" },
  { value: "WON", label: "Won" },
  { value: "LOST", label: "Lost" },
];

const BUDGET_OPTIONS = [
  { value: "UNDER_100K", label: "Under $100K" },
  { value: "FROM_100K_TO_250K", label: "$100K–$250K" },
  { value: "FROM_250K_TO_500K", label: "$250K–$500K" },
  { value: "FROM_500K_TO_1M", label: "$500K–$1M" },
  { value: "OVER_1M", label: "Over $1M" },
];

const LEAD_SOURCE_OPTIONS = [
  { value: "WEBSITE", label: "Website" },
  { value: "REFERRAL", label: "Referral" },
  { value: "SOCIAL_MEDIA", label: "Social Media" },
  { value: "GOOGLE_ADS", label: "Google Ads" },
  { value: "FACEBOOK_ADS", label: "Facebook Ads" },
  { value: "WALK_IN", label: "Walk In" },
  { value: "PARTNER", label: "Partner" },
  { value: "OTHER", label: "Other" },
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

const LEAD_FILTER_SELECTS = [
  { key: "stage", label: "By Status", options: LEAD_STAGE_OPTIONS },
  { key: "budgetRange", label: "By Budgets", options: BUDGET_OPTIONS },
  { key: "clientTag", label: "Client Tags", options: TAGS.map((t) => ({ value: t, label: t })) },
  { key: "country", label: "Country Origin", options: COUNTRY_OPTIONS },
  { key: "tag", label: "By Tag", options: TAGS.map((t) => ({ value: t, label: t })) },
  { key: "source", label: "By Source", options: LEAD_SOURCE_OPTIONS },
  { key: "segment", label: "By Segment", options: SEGMENT_OPTIONS },
];

const LEAD_FILTER_INPUTS = [
  { key: "projectName", placeholder: "Project Name" },
  { key: "clientName", placeholder: "Client Name" },
  { key: "clientPhone", placeholder: "Client Phone" },
  { key: "nextCallDate", placeholder: "Next Call", type: "date" },
  { key: "clientEmail", placeholder: "Client Email" },
  { key: "clientId", placeholder: "Client ID" },
];

interface PageProps {
  searchParams: Promise<{
    tab?: string;
    tag?: string;
    search?: string;
    page?: string;
    view?: string;
    stage?: LeadStage;
    budgetRange?: BudgetRange;
    source?: LeadSource;
    segment?: string;
    country?: string;
    clientTag?: string;
    projectName?: string;
    clientName?: string;
    clientPhone?: string;
    nextCallDate?: string;
    clientEmail?: string;
    clientId?: string;
  }>;
}

export default async function LeadsPage({ searchParams }: PageProps) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) return null;

  const params = await searchParams;
  const activeTab = params.tab || "all";
  const activeTag = params.tag || "";
  const activeView = params.view || "table";

  const [stats, agents] = await Promise.all([
    getLeadStats(),
    getAgentsForLeads(),
  ]);

  const statCards = [
    {
      title: "Total Leads",
      value: stats.total,
      icon: Target,
      color: "text-[#dc2626]",
      bg: "bg-blue-50",
    },
    {
      title: "New This Week",
      value: stats.newThisWeek,
      icon: Zap,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      title: "Avg Score",
      value: stats.avgScore,
      icon: TrendingUp,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Pipeline Stages",
      value: Object.keys(stats.byStage).length,
      icon: Users,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
  ];

  function buildUrl(overrides: Record<string, string | undefined>) {
    const base: Record<string, string> = {};
    if (params.search) base.search = params.search;
    if (params.view && params.view !== "table") base.view = params.view;
    if (params.stage) base.stage = params.stage;
    // Preserve filter bar params
    if (params.tag) base.tag = params.tag;
    if (params.budgetRange) base.budgetRange = params.budgetRange;
    if (params.source) base.source = params.source;
    if (params.segment) base.segment = params.segment;
    if (params.country) base.country = params.country;
    if (params.clientTag) base.clientTag = params.clientTag;
    if (params.projectName) base.projectName = params.projectName;
    if (params.clientName) base.clientName = params.clientName;
    if (params.clientPhone) base.clientPhone = params.clientPhone;
    if (params.nextCallDate) base.nextCallDate = params.nextCallDate;
    if (params.clientEmail) base.clientEmail = params.clientEmail;
    if (params.clientId) base.clientId = params.clientId;
    const merged = { ...base, ...overrides };
    const filtered = Object.fromEntries(
      Object.entries(merged).filter(([, v]) => v),
    );
    const qs = new URLSearchParams(
      filtered as Record<string, string>,
    ).toString();
    return `/leads${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
            <Target className="h-5 w-5 text-[#dc2626]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Lead Pipeline</h1>
            <p className="text-gray-500">Track and manage your sales leads</p>
          </div>
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
          {session.user.role !== "VIEWER" && (
            <Link href="/leads/create">
              <Button className="gap-2 bg-[#dc2626] hover:bg-[#b91c1c] text-white">
                <Plus className="h-4 w-4" />
                New Lead
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="border border-gray-200">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.title}</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    {stat.value}
                  </p>
                </div>
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.bg}`}
                >
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <form action="/leads" method="get">
        {activeTab !== "all" && (
          <input type="hidden" name="tab" value={activeTab} />
        )}
        {activeView !== "table" && (
          <input type="hidden" name="view" value={activeView} />
        )}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            name="search"
            defaultValue={params.search || ""}
            placeholder="Search by name, lead number, email, or phone..."
            className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-[#dc2626] focus:outline-none focus:ring-1 focus:ring-[#dc2626]"
          />
        </div>
      </form>

      {/* Filter Bar */}
      <FilterBar
        selects={LEAD_FILTER_SELECTS}
        textInputs={LEAD_FILTER_INPUTS}
        preserveParams={["tab", "view", "search"]}
      />

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
          </Link>
        ))}
      </div>

      {/* Content - Board or Table */}
      {activeView === "board" ? (
        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
          <KanbanWrapper />
        </Suspense>
      ) : (
        <Suspense fallback={<TableSkeleton />}>
          <LeadsTableWrapper
            searchParams={searchParams}
            agents={agents}
            userRole={session.user.role}
          />
        </Suspense>
      )}
    </div>
  );
}

async function KanbanWrapper() {
  const stageData = await getLeadsByStage();
  return <LeadKanban initialData={stageData} />;
}

async function LeadsTableWrapper({
  searchParams,
  agents,
  userRole,
}: {
  searchParams: PageProps["searchParams"];
  agents: { id: string; firstName: string; lastName: string }[];
  userRole: string;
}) {
  const params = await searchParams;
  const { leads, total, pages, currentPage } = await getLeads({
    search: params.search,
    stage: params.stage,
    page: params.page ? parseInt(params.page) : 1,
    tab: params.tab || "all",
    tag: params.tag,
    budgetRange: params.budgetRange,
    source: params.source,
    segment: params.segment,
    country: params.country,
    clientTag: params.clientTag,
    projectName: params.projectName,
    clientName: params.clientName,
    clientPhone: params.clientPhone,
    nextCallDate: params.nextCallDate,
    clientEmail: params.clientEmail,
    clientId: params.clientId,
  });

  const serialized = leads.map((l) => ({
    ...l,
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
    nextCallDate: l.nextCallDate ? l.nextCallDate.toISOString() : null,
    slaDeadline: l.slaDeadline ? l.slaDeadline.toISOString() : null,
    estimatedValue: l.estimatedValue ? Number(l.estimatedValue) : null,
    lastNote: l.notes[0]
      ? {
          content: l.notes[0].content,
          createdAt: l.notes[0].createdAt.toISOString(),
          agent: l.notes[0].agent,
        }
      : null,
  }));

  return (
    <LeadsTable
      leads={serialized}
      agents={agents}
      total={total}
      pages={pages}
      currentPage={currentPage}
      userRole={userRole}
    />
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}
