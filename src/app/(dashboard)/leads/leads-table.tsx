"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
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
  Eye,
  Phone,
  Mail,
  Users,
  StickyNote,
  ChevronLeft,
  ChevronRight,
  Tag,
  MessageSquare,
  Download,
} from "lucide-react";
import {
  updateLeadField,
  updateLeadStage,
  assignLeadToPool,
  removeLeadFromPool,
} from "@/lib/actions/leads";
import { generateCSV, downloadCSV } from "@/lib/export";

const stageColors: Record<string, string> = {
  NEW_ENQUIRY: "bg-gray-100 text-gray-700",
  CONTACTED: "bg-blue-100 text-blue-700",
  QUALIFIED: "bg-indigo-100 text-indigo-700",
  VIEWING_ARRANGED: "bg-purple-100 text-purple-700",
  VIEWED: "bg-pink-100 text-pink-700",
  OFFER_MADE: "bg-orange-100 text-orange-700",
  NEGOTIATING: "bg-yellow-100 text-yellow-700",
  WON: "bg-emerald-100 text-emerald-700",
  LOST: "bg-red-100 text-red-700",
};

const stageLabels: Record<string, string> = {
  NEW_ENQUIRY: "New Enquiry",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  VIEWING_ARRANGED: "Viewing",
  VIEWED: "Viewed",
  OFFER_MADE: "Offer Made",
  NEGOTIATING: "Negotiating",
  WON: "Won",
  LOST: "Lost",
};

const priorityColors: Record<string, string> = {
  Low: "text-gray-500",
  Medium: "text-yellow-600",
  High: "text-orange-600",
  Urgent: "text-red-600",
};

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

interface SerializedLead {
  id: string;
  leadNumber: string;
  title: string;
  stage: string;
  estimatedValue: number | null;
  currency: string;
  source: string;
  score: number | null;
  tags: string[];
  segment: string | null;
  priority: string | null;
  nextCallDate: string | null;
  snooze: string | null;
  createdAt: string;
  owner: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  client: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  _count: { activities: number; tasks: number };
  lastNote: {
    content: string;
    createdAt: string;
    agent: { id: string; firstName: string; lastName: string };
  } | null;
}

interface LeadsTableProps {
  leads: SerializedLead[];
  agents: { id: string; firstName: string; lastName: string }[];
  total: number;
  pages: number;
  currentPage: number;
}

export function LeadsTable({
  leads,
  agents,
  total,
  pages,
  currentPage,
}: LeadsTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleFieldChange(
    leadId: string,
    field: string,
    value: string | boolean | null,
  ) {
    startTransition(async () => {
      await updateLeadField(leadId, field, value);
      router.refresh();
    });
  }

  function handleStageChange(leadId: string, stage: string) {
    startTransition(async () => {
      await updateLeadStage(leadId, stage as any);
      router.refresh();
    });
  }

  function handleExportCSV() {
    const csv = generateCSV(leads as unknown as Record<string, unknown>[], [
      { key: "leadNumber", header: "Lead #" },
      { key: "client.firstName", header: "First Name" },
      { key: "client.lastName", header: "Last Name" },
      { key: "client.email", header: "Email" },
      { key: "client.phone", header: "Phone" },
      { key: "title", header: "Title" },
      { key: "stage", header: "Stage" },
      { key: "estimatedValue", header: "Value" },
      { key: "currency", header: "Currency" },
      { key: "source", header: "Source" },
      { key: "priority", header: "Priority" },
      { key: "owner.firstName", header: "Owner First Name" },
      { key: "owner.lastName", header: "Owner Last Name" },
      { key: "createdAt", header: "Created" },
    ]);
    downloadCSV(
      csv,
      `leads-export-${new Date().toISOString().slice(0, 10)}.csv`,
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center justify-end px-4 py-2 border-b border-gray-100">
        <Button variant="outline" size="sm" onClick={handleExportCSV}>
          <Download className="h-4 w-4 mr-1" />
          Export CSV
        </Button>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="w-[100px]">Lead #</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Value</TableHead>
              <TableHead className="min-w-[200px]">Last Note</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Next Call</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={11}
                  className="py-12 text-center text-gray-500"
                >
                  No leads found
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead) => (
                <TableRow
                  key={lead.id}
                  className={`hover:bg-gray-50 ${isPending ? "opacity-60" : ""}`}
                >
                  {/* Lead Number */}
                  <TableCell className="text-xs font-mono text-gray-500">
                    {lead.leadNumber}
                  </TableCell>

                  {/* Client */}
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {lead.client.firstName} {lead.client.lastName}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{lead.client.phone}</span>
                      </div>
                    </div>
                  </TableCell>

                  {/* Title */}
                  <TableCell>
                    <Link
                      href={`/leads/${lead.id}`}
                      className="text-sm font-medium text-gray-900 hover:text-[#dc2626]"
                    >
                      {lead.title}
                    </Link>
                  </TableCell>

                  {/* Stage */}
                  <TableCell>
                    <select
                      value={lead.stage}
                      onChange={(e) =>
                        handleStageChange(lead.id, e.target.value)
                      }
                      className={`rounded-full px-2 py-1 text-xs font-medium border-0 cursor-pointer ${stageColors[lead.stage] || "bg-gray-100"}`}
                    >
                      {Object.entries(stageLabels).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </TableCell>

                  {/* Value */}
                  <TableCell className="text-sm">
                    {lead.estimatedValue
                      ? `$${lead.estimatedValue.toLocaleString()}`
                      : "-"}
                  </TableCell>

                  {/* Last Note */}
                  <TableCell>
                    {lead.lastNote ? (
                      <div className="max-w-[220px]">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          {lead.lastNote.content.startsWith("[CALL]") ? (
                            <Phone className="h-3 w-3 text-blue-500 shrink-0" />
                          ) : lead.lastNote.content.startsWith("[EMAIL]") ? (
                            <Mail className="h-3 w-3 text-purple-500 shrink-0" />
                          ) : lead.lastNote.content.startsWith("[SPOKEN]") ? (
                            <Users className="h-3 w-3 text-emerald-500 shrink-0" />
                          ) : (
                            <StickyNote className="h-3 w-3 text-gray-400 shrink-0" />
                          )}
                          <span className="text-[10px] text-gray-400">
                            {lead.lastNote.agent.firstName}{" "}
                            {lead.lastNote.agent.lastName}
                            {" · "}
                            {formatRelativeTime(lead.lastNote.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-2">
                          {lead.lastNote.content.replace(
                            /^\[(CALL|EMAIL|SPOKEN)\]\s*/,
                            "",
                          )}
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </TableCell>

                  {/* Priority */}
                  <TableCell>
                    <select
                      value={lead.priority || "Medium"}
                      onChange={(e) =>
                        handleFieldChange(lead.id, "priority", e.target.value)
                      }
                      className={`text-xs font-medium bg-transparent border-0 cursor-pointer ${priorityColors[lead.priority || "Medium"] || ""}`}
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </TableCell>

                  {/* Next Call */}
                  <TableCell>
                    <input
                      type="date"
                      value={
                        lead.nextCallDate
                          ? new Date(lead.nextCallDate)
                              .toISOString()
                              .slice(0, 10)
                          : ""
                      }
                      onChange={(e) =>
                        handleFieldChange(
                          lead.id,
                          "nextCallDate",
                          e.target.value ? e.target.value : null,
                        )
                      }
                      className="text-xs border-0 bg-transparent text-gray-600 cursor-pointer"
                    />
                  </TableCell>

                  {/* Tags */}
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-[150px]">
                      {lead.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-0.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600"
                        >
                          <Tag className="h-2.5 w-2.5" />
                          {tag}
                        </span>
                      ))}
                      {lead.tags.length > 2 && (
                        <span className="text-[10px] text-gray-400">
                          +{lead.tags.length - 2}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  {/* Owner */}
                  <TableCell>
                    <select
                      value={
                        lead.tags?.includes("POOL_1")
                          ? "POOL_1"
                          : lead.tags?.includes("POOL_2")
                            ? "POOL_2"
                            : lead.tags?.includes("POOL_3")
                              ? "POOL_3"
                              : lead.owner.id
                      }
                      onChange={async (e) => {
                        const val = e.target.value;
                        if (
                          val === "POOL_1" ||
                          val === "POOL_2" ||
                          val === "POOL_3"
                        ) {
                          startTransition(async () => {
                            await assignLeadToPool(lead.id, val);
                            router.refresh();
                          });
                        } else {
                          if (lead.tags?.some((t) => t.startsWith("POOL_"))) {
                            startTransition(async () => {
                              await removeLeadFromPool(lead.id);
                              await updateLeadField(lead.id, "ownerId", val);
                              router.refresh();
                            });
                          } else {
                            handleFieldChange(lead.id, "ownerId", val);
                          }
                        }
                      }}
                      className="text-xs bg-transparent border-0 cursor-pointer text-gray-700 max-w-[100px]"
                    >
                      <option value="POOL_1">Pool 1</option>
                      <option value="POOL_2">Pool 2</option>
                      <option value="POOL_3">Pool 3</option>
                      {agents.map((agent) => (
                        <option key={agent.id} value={agent.id}>
                          {agent.firstName} {agent.lastName}
                        </option>
                      ))}
                    </select>
                  </TableCell>

                  {/* Actions */}
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Link href={`/leads/${lead.id}`}>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      {lead.client.phone && (
                        <a href={`tel:${lead.client.phone}`}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                          >
                            <Phone className="h-3.5 w-3.5" />
                          </Button>
                        </a>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
          <p className="text-sm text-gray-500">
            Showing {(currentPage - 1) * 50 + 1} to{" "}
            {Math.min(currentPage * 50, total)} of {total} leads
          </p>
          <div className="flex items-center gap-2">
            <Link
              href={`/leads?page=${Math.max(1, currentPage - 1)}&view=table`}
            >
              <Button variant="outline" size="sm" disabled={currentPage <= 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </Link>
            <span className="text-sm text-gray-600">
              Page {currentPage} of {pages}
            </span>
            <Link
              href={`/leads?page=${Math.min(pages, currentPage + 1)}&view=table`}
            >
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= pages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
