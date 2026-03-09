"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Eye,
  Phone,
  Mail,
  Users,
  StickyNote,
  ChevronLeft,
  ChevronRight,
  Tag,
  Download,
  Trash2,
  CalendarDays,
  MessageSquare,
  CheckSquare,
} from "lucide-react";
import {
  updateLeadField,
  updateLeadStage,
  assignLeadToPool,
  removeLeadFromPool,
  deleteLead,
  bulkDeleteLeads,
} from "@/lib/actions/leads";
import { generateCSV, downloadCSV } from "@/lib/export";
import { toast } from "@/components/ui/use-toast";
import type { LeadStage } from "@prisma/client";

const stageColors: Record<string, string> = {
  NEW_ENQUIRY: "bg-gray-100 text-gray-700 border-gray-200",
  CONTACTED: "bg-blue-50 text-blue-700 border-blue-200",
  QUALIFIED: "bg-indigo-50 text-indigo-700 border-indigo-200",
  VIEWING_ARRANGED: "bg-purple-50 text-purple-700 border-purple-200",
  VIEWED: "bg-pink-50 text-pink-700 border-pink-200",
  OFFER_MADE: "bg-orange-50 text-orange-700 border-orange-200",
  NEGOTIATING: "bg-yellow-50 text-yellow-700 border-yellow-200",
  WON: "bg-emerald-50 text-emerald-700 border-emerald-200",
  LOST: "bg-red-50 text-red-700 border-red-200",
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
  Low: "text-green-600 bg-green-50 border-green-200",
  Medium: "text-orange-600 bg-orange-50 border-orange-200",
  High: "text-red-600 bg-red-50 border-red-200",
  Urgent: "text-red-700 bg-red-100 border-red-300",
};

const sourceLabels: Record<string, string> = {
  WEBSITE: "Website",
  REFERRAL: "Referral",
  SOCIAL_MEDIA: "Social",
  GOOGLE_ADS: "Google",
  FACEBOOK_ADS: "Facebook",
  WALK_IN: "Walk-in",
  PARTNER: "Partner",
  OTHER: "Other",
};

const sourceBgColors: Record<string, string> = {
  WEBSITE: "bg-blue-100 text-blue-700",
  REFERRAL: "bg-orange-100 text-orange-700",
  SOCIAL_MEDIA: "bg-pink-100 text-pink-700",
  GOOGLE_ADS: "bg-red-100 text-red-700",
  FACEBOOK_ADS: "bg-indigo-100 text-indigo-700",
  WALK_IN: "bg-green-100 text-green-700",
  PARTNER: "bg-purple-100 text-purple-700",
  OTHER: "bg-gray-100 text-gray-700",
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
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
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
  owner: { id: string; firstName: string; lastName: string; email: string };
  client: { id: string; firstName: string; lastName: string; email: string; phone: string };
  _count: { activities: number; tasks: number };
  lastNote: {
    content: string;
    createdAt: string;
    agent: { id: string; firstName: string; lastName: string };
  } | null;
}

interface Pool {
  tag: string;
  name: string;
}

interface LeadsTableProps {
  leads: SerializedLead[];
  agents: { id: string; firstName: string; lastName: string }[];
  pools?: Pool[];
  total: number;
  pages: number;
  currentPage: number;
  userRole?: string;
}

export function LeadsTable({
  leads,
  agents,
  pools = [],
  total,
  pages,
  currentPage,
  userRole,
}: LeadsTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showBulkDelete, setShowBulkDelete] = useState(false);

  // Optimistic overrides
  const [localStageOverrides, setLocalStageOverrides] = useState<Record<string, string>>({});
  const [localPriorityOverrides, setLocalPriorityOverrides] = useState<Record<string, string>>({});
  const [localOwnerOverrides, setLocalOwnerOverrides] = useState<Record<string, string>>({});
  const [localNextCallOverrides, setLocalNextCallOverrides] = useState<Record<string, string>>({});

  const canDelete = userRole === "SUPER_ADMIN";

  const toggleSelectAll = () => {
    if (selectedRows.size === leads.length) setSelectedRows(new Set());
    else setSelectedRows(new Set(leads.map((l) => l.id)));
  };

  const toggleSelectRow = (id: string) => {
    const next = new Set(selectedRows);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedRows(next);
  };

  const handleDelete = () => {
    if (!deleteId) return;
    startTransition(async () => {
      try {
        await deleteLead(deleteId);
        toast({ title: "Lead deleted", description: "The lead has been removed." });
        setDeleteId(null);
        router.refresh();
      } catch {
        toast({ variant: "destructive", title: "Error", description: "Failed to delete lead." });
      }
    });
  };

  const handleBulkDelete = () => {
    startTransition(async () => {
      try {
        await bulkDeleteLeads(Array.from(selectedRows));
        toast({ title: "Leads deleted", description: `${selectedRows.size} lead(s) deleted.` });
        setSelectedRows(new Set());
        setShowBulkDelete(false);
        router.refresh();
      } catch {
        toast({ variant: "destructive", title: "Error", description: "Failed to delete leads." });
      }
    });
  };

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
      { key: "source", header: "Source" },
      { key: "priority", header: "Priority" },
      { key: "owner.firstName", header: "Owner First Name" },
      { key: "owner.lastName", header: "Owner Last Name" },
      { key: "createdAt", header: "Created" },
    ]);
    downloadCSV(csv, `leads-export-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  if (leads.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white py-12 text-center">
        <p className="text-gray-500">No leads found</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      {/* Bulk Delete Bar */}
      {canDelete && selectedRows.size > 0 && (
        <div className="flex items-center gap-3 border-b border-red-200 bg-red-50 px-4 py-2">
          <span className="text-sm font-medium text-red-700">{selectedRows.size} selected</span>
          <Button size="sm" variant="destructive" onClick={() => setShowBulkDelete(true)}>
            <Trash2 className="h-4 w-4 mr-1" />
            Delete Selected
          </Button>
        </div>
      )}

      {userRole === "SUPER_ADMIN" && (
        <div className="flex items-center justify-end px-4 py-2 border-b border-gray-100">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-1" />
            Export CSV
          </Button>
        </div>
      )}

      {/* Column Headers */}
      <div
        className="grid border-b border-gray-200 bg-gray-50 text-[10px] font-semibold uppercase tracking-wider text-gray-500"
        style={{ gridTemplateColumns: canDelete ? "40px 110px 185px 1fr 200px 175px" : "110px 185px 1fr 200px 175px" }}
      >
        {canDelete && (
          <div className="flex items-center justify-center px-2 py-2.5">
            <Checkbox
              checked={selectedRows.size === leads.length && leads.length > 0}
              onCheckedChange={toggleSelectAll}
            />
          </div>
        )}
        <div className="px-2 py-2.5">Lead #</div>
        <div className="px-3 py-2.5 border-l border-gray-200">Client Info</div>
        <div className="px-3 py-2.5 border-l border-gray-200">Lead Details</div>
        <div className="px-3 py-2.5 border-l border-gray-200">Stage & Dates</div>
        <div className="px-3 py-2.5 border-l border-gray-200">Owner</div>
      </div>

      {/* Rows */}
      <div className={`divide-y divide-gray-100 ${isPending ? "opacity-60" : ""}`}>
        {leads.map((lead) => {
          const nextCall = localNextCallOverrides[lead.id] !== undefined
            ? localNextCallOverrides[lead.id]
            : lead.nextCallDate ? lead.nextCallDate.slice(0, 10) : "";
          const isPastCall = lead.nextCallDate && new Date(lead.nextCallDate) < new Date(new Date().setHours(0, 0, 0, 0));
          const currentStage = localStageOverrides[lead.id] ?? lead.stage;
          const currentPriority = localPriorityOverrides[lead.id] ?? lead.priority ?? "Medium";
          const currentOwner = localOwnerOverrides[lead.id] !== undefined
            ? localOwnerOverrides[lead.id]
            : lead.tags?.find((t) => t.startsWith("POOL_")) || lead.owner.id;

          return (
            <div
              key={lead.id}
              className={`grid hover:bg-gray-50/60 transition-colors ${isPastCall ? "bg-amber-50/40" : "bg-white"}`}
              style={{ gridTemplateColumns: canDelete ? "40px 110px 185px 1fr 200px 175px" : "110px 185px 1fr 200px 175px" }}
            >
              {/* Checkbox */}
              {canDelete && (
                <div className="flex items-start justify-center pt-3 px-2">
                  <Checkbox
                    checked={selectedRows.has(lead.id)}
                    onCheckedChange={() => toggleSelectRow(lead.id)}
                  />
                </div>
              )}

              {/* Lead Number */}
              <div className="flex flex-col gap-1.5 px-2 py-3">
                <span className="text-[10px] font-mono font-bold text-gray-500 leading-none">{lead.leadNumber}</span>
                {lead.estimatedValue && (
                  <span className="text-[10px] font-semibold text-emerald-600">
                    ${lead.estimatedValue.toLocaleString()}
                  </span>
                )}
                {lead._count.activities > 0 && (
                  <span className="flex items-center gap-0.5 text-[9px] text-gray-400">
                    <MessageSquare className="h-2.5 w-2.5" />
                    {lead._count.activities}
                  </span>
                )}
                {lead._count.tasks > 0 && (
                  <span className="flex items-center gap-0.5 text-[9px] text-gray-400">
                    <CheckSquare className="h-2.5 w-2.5" />
                    {lead._count.tasks}
                  </span>
                )}
              </div>

              {/* Client Info */}
              <div className="px-3 py-3 border-l border-gray-100 space-y-1.5 min-w-0">
                <p className="text-xs font-semibold text-gray-900 leading-tight">
                  {lead.client.firstName} {lead.client.lastName}
                </p>
                <a
                  href={`mailto:${lead.client.email}`}
                  className="block text-[11px] text-[#dc2626] hover:underline truncate"
                  title={lead.client.email}
                >
                  <Mail className="inline h-3 w-3 mr-0.5" />
                  {lead.client.email}
                </a>
                <a
                  href={`tel:${lead.client.phone}`}
                  className="block text-[11px] text-[#dc2626] hover:underline"
                >
                  <Phone className="inline h-3 w-3 mr-0.5" />
                  {lead.client.phone}
                </a>
                <div>
                  <span className={`inline-flex rounded px-1.5 py-0.5 text-[9px] font-medium ${sourceBgColors[lead.source] || "bg-gray-100 text-gray-700"}`}>
                    {sourceLabels[lead.source] || lead.source}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400">
                  {new Date(lead.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                </p>
              </div>

              {/* Lead Details */}
              <div className="px-3 py-3 border-l border-gray-100 space-y-2 min-w-0">
                <div className="flex items-start justify-between gap-1">
                  <Link
                    href={`/leads/${lead.id}`}
                    className="text-sm font-semibold text-gray-900 hover:text-[#dc2626] hover:underline line-clamp-2 leading-snug"
                  >
                    {lead.title}
                  </Link>
                  <Link
                    href={`/leads/${lead.id}`}
                    className="shrink-0 rounded p-1 text-gray-400 hover:text-[#dc2626] hover:bg-gray-100"
                    title="View Lead"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Link>
                </div>

                {/* Last Note */}
                {lead.lastNote ? (
                  <div className="text-[11px] text-gray-600">
                    <div className="flex items-center gap-1 mb-0.5">
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
                        {lead.lastNote.agent.firstName} {lead.lastNote.agent.lastName} · {formatRelativeTime(lead.lastNote.createdAt)}
                      </span>
                    </div>
                    <p className="line-clamp-2 leading-snug">
                      {lead.lastNote.content.replace(/^\[(CALL|EMAIL|SPOKEN)\]\s*/, "")}
                    </p>
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-400">No notes yet</p>
                )}

                {/* Tags */}
                {lead.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {lead.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="inline-flex items-center gap-0.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-[9px] font-medium text-gray-600">
                        <Tag className="h-2.5 w-2.5" />
                        {tag}
                      </span>
                    ))}
                    {lead.tags.length > 3 && (
                      <span className="text-[10px] text-gray-400">+{lead.tags.length - 3}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Stage & Dates */}
              <div className="px-3 py-3 border-l border-gray-100 space-y-2 min-w-0">
                {/* Stage */}
                <div>
                  <p className="text-[10px] text-gray-400 font-medium mb-0.5">Stage:</p>
                  <select
                    className={`w-full rounded border px-1.5 py-1 text-[11px] font-medium cursor-pointer ${stageColors[currentStage] || "bg-gray-100 text-gray-700 border-gray-200"}`}
                    value={currentStage}
                    onChange={async (e) => {
                      const val = e.target.value;
                      setLocalStageOverrides((prev) => ({ ...prev, [lead.id]: val }));
                      try {
                        await updateLeadStage(lead.id, val as LeadStage);
                        startTransition(() => router.refresh());
                      } catch {
                        setLocalStageOverrides((prev) => { const n = { ...prev }; delete n[lead.id]; return n; });
                        toast({ variant: "destructive", title: "Error", description: "Failed to update stage" });
                      }
                    }}
                  >
                    {Object.entries(stageLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <p className="text-[10px] text-gray-400 font-medium mb-0.5">Priority:</p>
                  <select
                    className={`w-full rounded border px-1.5 py-1 text-[11px] font-medium cursor-pointer ${priorityColors[currentPriority] || "bg-gray-50 border-gray-200 text-gray-700"}`}
                    value={currentPriority}
                    onChange={async (e) => {
                      const val = e.target.value;
                      setLocalPriorityOverrides((prev) => ({ ...prev, [lead.id]: val }));
                      try {
                        await updateLeadField(lead.id, "priority", val);
                        startTransition(() => router.refresh());
                      } catch {
                        setLocalPriorityOverrides((prev) => { const n = { ...prev }; delete n[lead.id]; return n; });
                        toast({ variant: "destructive", title: "Error", description: "Failed to update priority" });
                      }
                    }}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>

                {/* Next Call */}
                <div>
                  <p className="text-[10px] text-gray-400 font-medium mb-0.5">
                    <CalendarDays className="inline h-3 w-3 mr-0.5" />
                    Next Call:
                  </p>
                  <input
                    type="date"
                    className={`w-full rounded border px-1.5 py-1 text-[11px] cursor-pointer ${isPastCall ? "border-red-300 bg-red-50 text-red-700" : "border-gray-200 bg-white text-gray-700"}`}
                    value={nextCall}
                    onChange={(e) => {
                      setLocalNextCallOverrides((prev) => ({ ...prev, [lead.id]: e.target.value }));
                    }}
                    onBlur={async (e) => {
                      const val = e.target.value;
                      try {
                        await updateLeadField(lead.id, "nextCallDate", val || null);
                        startTransition(() => router.refresh());
                      } catch {
                        toast({ variant: "destructive", title: "Error", description: "Failed to update next call date" });
                      }
                    }}
                  />
                </div>
              </div>

              {/* Owner */}
              <div className="px-3 py-3 border-l border-gray-100 space-y-2 min-w-0">
                <div>
                  <p className="text-[10px] text-gray-400 font-medium mb-0.5">Owner:</p>
                  <select
                    className="w-full rounded border border-gray-200 bg-white px-1.5 py-1 text-[11px] text-gray-700 cursor-pointer"
                    value={currentOwner}
                    onChange={async (e) => {
                      const val = e.target.value;
                      setLocalOwnerOverrides((prev) => ({ ...prev, [lead.id]: val }));
                      try {
                        if (val.startsWith("POOL_")) {
                          await assignLeadToPool(lead.id, val);
                        } else {
                          if (lead.tags?.some((t) => t.startsWith("POOL_"))) {
                            await removeLeadFromPool(lead.id);
                          }
                          await updateLeadField(lead.id, "ownerId", val);
                        }
                        startTransition(() => router.refresh());
                      } catch {
                        setLocalOwnerOverrides((prev) => { const n = { ...prev }; delete n[lead.id]; return n; });
                        toast({ variant: "destructive", title: "Error", description: "Failed to update owner" });
                      }
                    }}
                  >
                    {pools.map((pool) => (
                      <option key={pool.tag} value={pool.tag}>
                        {pool.name}
                      </option>
                    ))}
                    {agents.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.firstName} {agent.lastName}
                      </option>
                    ))}
                  </select>
                </div>

                {lead.segment && (
                  <p className="text-[10px] text-gray-500">
                    Segment: <span className="font-medium text-gray-700">{lead.segment}</span>
                  </p>
                )}

                {canDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-7 text-red-500 hover:text-red-700 hover:bg-red-50 text-[10px] mt-1"
                    onClick={() => setDeleteId(lead.id)}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
          <p className="text-xs text-gray-500">
            Showing {(currentPage - 1) * 50 + 1} to {Math.min(currentPage * 50, total)} of {total} leads
          </p>
          <div className="flex items-center gap-2">
            <Link href={`/leads?page=${Math.max(1, currentPage - 1)}&view=table`}>
              <Button variant="outline" size="sm" disabled={currentPage <= 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </Link>
            <span className="text-xs text-gray-600">Page {currentPage} of {pages}</span>
            <Link href={`/leads?page=${Math.min(pages, currentPage + 1)}&view=table`}>
              <Button variant="outline" size="sm" disabled={currentPage >= pages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Single Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this lead? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Dialog */}
      <AlertDialog open={showBulkDelete} onOpenChange={setShowBulkDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedRows.size} Lead(s)</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedRows.size} selected lead(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-700 text-white">
              Delete {selectedRows.size} Lead(s)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
