import { Suspense } from "react";
import Link from "next/link";
import {
  getEnquiries,
  getAgents,
  getActiveProperties,
} from "@/lib/actions/enquiries";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";
import { EnquiriesTable } from "./enquiries-table";
import { AddEnquiryDialog } from "./add-enquiry-dialog";
import { ImportLeads } from "./import-leads";
import type { EnquiryStatus, EnquirySource } from "@prisma/client";

const tags = [
  "Cash Buyer",
  "First-time Buyer",
  "Investor",
  "Multiple Properties",
  "Pre-approved",
  "Relocating",
];

interface PageProps {
  searchParams: Promise<{
    status?: EnquiryStatus;
    source?: EnquirySource;
    agent?: string;
    page?: string;
    tab?: string;
  }>;
}

async function EnquiriesTableWrapper({
  searchParams,
}: {
  searchParams: PageProps["searchParams"];
}) {
  const params = await searchParams;
  const [{ enquiries, total, pages, currentPage }, agents, properties] =
    await Promise.all([
      getEnquiries({
        status: params.status,
        source: params.source,
        agentId: params.agent,
        page: params.page ? parseInt(params.page) : 1,
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
  const [agents, properties] = await Promise.all([
    getAgents(),
    getActiveProperties(),
  ]);

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
          <ImportLeads />
          <AddEnquiryDialog agents={agents} properties={properties} />
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-3">
        <Select>
          <SelectTrigger className="w-[140px] bg-white">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="hot">Hot</SelectItem>
            <SelectItem value="warm">Warm</SelectItem>
            <SelectItem value="cold">Cold</SelectItem>
            <SelectItem value="new">New</SelectItem>
          </SelectContent>
        </Select>

        <Select>
          <SelectTrigger className="w-[140px] bg-white">
            <SelectValue placeholder="All Budgets" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Budgets</SelectItem>
            <SelectItem value="under-500k">Under $500k</SelectItem>
            <SelectItem value="500k-1m">$500k - $1M</SelectItem>
            <SelectItem value="1m-plus">$1M+</SelectItem>
          </SelectContent>
        </Select>

        <Select>
          <SelectTrigger className="w-[160px] bg-white">
            <SelectValue placeholder="All Countries" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Countries</SelectItem>
            <SelectItem value="us">United States</SelectItem>
            <SelectItem value="uk">United Kingdom</SelectItem>
            <SelectItem value="ca">Canada</SelectItem>
            <SelectItem value="au">Australia</SelectItem>
          </SelectContent>
        </Select>

        <Select>
          <SelectTrigger className="w-[140px] bg-white">
            <SelectValue placeholder="All Sources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="website">Website</SelectItem>
            <SelectItem value="referral">Referral</SelectItem>
            <SelectItem value="social">Social Media</SelectItem>
            <SelectItem value="email">Email Campaign</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Search leads..."
            className="w-[200px] bg-white pl-10"
          />
        </div>
      </div>

      {/* Tags Row */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-500">Tags:</span>
        {tags.map((tag) => (
          <button
            key={tag}
            className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        {[
          { key: "48h", label: "Last 48 Hours" },
          { key: "today", label: "Today" },
          { key: "new", label: "New Leads" },
          { key: "tagged", label: "Tagged" },
          { key: "all", label: "All" },
        ].map((tab) => (
          <Link
            key={tab.key}
            href={`/clients/enquiries?tab=${tab.key}`}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-[#dc2626] text-white rounded-t-lg"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <Suspense fallback={<EnquiriesTableSkeleton />}>
          <EnquiriesTableWrapper searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
