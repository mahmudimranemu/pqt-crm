"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { toast } from "@/components/ui/use-toast";
import {
  Eye,
  Loader2,
  UserPlus,
  Download,
  Trash2,
  Phone,
  Mail,
  CalendarDays,
} from "lucide-react";
import {
  updateEnquiryField,
  updateEnquiryStatus,
  convertToClient,
  assignEnquiryToPool,
  removeEnquiryFromPool,
  deleteEnquiry,
  bulkDeleteEnquiries,
  bulkAssignEnquiries,
} from "@/lib/actions/enquiries";
import { createBooking } from "@/lib/actions/bookings";
import { generateCSV, downloadCSV } from "@/lib/export";
import { AddEnquiryDialog } from "./add-enquiry-dialog";
import type { EnquiryStatus } from "@prisma/client";

interface Agent {
  id: string;
  firstName: string;
  lastName: string;
}

interface Property {
  id: string;
  name: string;
  pqtNumber: string;
}

interface EnquiryRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message: string | null;
  notes: {
    id: string;
    content: string;
    createdAt: string;
    agent: { firstName: string; lastName: string };
  }[];
  source: string;
  status: string;
  budget: string | null;
  country: string | null;
  tags: string[];
  called: boolean;
  spoken: boolean;
  segment: string | null;
  leadStatus: string | null;
  priority: string | null;
  nextCallDate: string | null;
  snooze: string | null;
  assignedAgentId: string | null;
  convertedClientId: string | null;
  assignedAgent: { id: string; firstName: string; lastName: string } | null;
  createdAt: string;
}

interface Pool {
  tag: string;
  name: string;
}

interface EnquiriesTableProps {
  enquiries: EnquiryRow[];
  agents: Agent[];
  properties: Property[];
  pools?: Pool[];
  total: number;
  pages: number;
  currentPage: number;
  userRole?: string;
}

const sourceLabels: Record<string, string> = {
  WEBSITE_FORM: "Website",
  PHONE_CALL: "Phone Call",
  EMAIL: "Email",
  WHATSAPP: "WhatsApp",
  LIVE_CHAT: "Live Chat",
  PARTNER_REFERRAL: "Referral",
};

const sourceBgColors: Record<string, string> = {
  WEBSITE_FORM: "bg-blue-100 text-blue-700",
  PHONE_CALL: "bg-gray-100 text-gray-700",
  EMAIL: "bg-purple-100 text-purple-700",
  WHATSAPP: "bg-green-100 text-green-700",
  LIVE_CHAT: "bg-yellow-100 text-yellow-700",
  PARTNER_REFERRAL: "bg-orange-100 text-orange-700",
};

const priorityColors: Record<string, string> = {
  High: "text-red-600 bg-red-50 border-red-200",
  Medium: "text-orange-600 bg-orange-50 border-orange-200",
  Low: "text-green-600 bg-green-50 border-green-200",
};

const statusLabels: Record<string, string> = {
  NEW: "New",
  ASSIGNED: "Assigned",
  CONTACTED: "Contacted",
  CONVERTED_TO_CLIENT: "Converted",
  SPAM: "Spam",
  CLOSED: "Closed",
};

const statusColors: Record<string, string> = {
  NEW: "bg-blue-50 text-blue-700",
  ASSIGNED: "bg-purple-50 text-purple-700",
  CONTACTED: "bg-amber-50 text-amber-700",
  CONVERTED_TO_CLIENT: "bg-green-50 text-green-700",
  SPAM: "bg-red-50 text-red-600",
  CLOSED: "bg-gray-50 text-gray-600",
};

export function EnquiriesTable({
  enquiries,
  agents,
  properties,
  pools = [],
  total,
  pages,
  currentPage,
  userRole,
}: EnquiriesTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Optimistic local overrides
  const [localAgentOverrides, setLocalAgentOverrides] = useState<Record<string, string>>({});
  const [localPriorityOverrides, setLocalPriorityOverrides] = useState<Record<string, string>>({});
  const [localCalledOverrides, setLocalCalledOverrides] = useState<Record<string, boolean>>({});
  const [localSpokenOverrides, setLocalSpokenOverrides] = useState<Record<string, boolean>>({});
  const [localStatusOverrides, setLocalStatusOverrides] = useState<Record<string, string>>({});
  const [localSegmentOverrides, setLocalSegmentOverrides] = useState<Record<string, string>>({});
  const [localNextCallOverrides, setLocalNextCallOverrides] = useState<Record<string, string>>({});

  useEffect(() => {
    setLocalAgentOverrides({});
    setLocalPriorityOverrides({});
    setLocalCalledOverrides({});
    setLocalSpokenOverrides({});
    setLocalStatusOverrides({});
    setLocalSegmentOverrides({});
    setLocalNextCallOverrides({});
  }, [enquiries]);

  // Bulk select/delete state
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showBulkDelete, setShowBulkDelete] = useState(false);

  const canDelete = userRole === "SUPER_ADMIN";

  const toggleSelectAll = () => {
    if (selectedRows.size === enquiries.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(enquiries.map((e) => e.id)));
    }
  };

  const toggleSelectRow = (id: string) => {
    const next = new Set(selectedRows);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedRows(next);
  };

  const handleDeleteSingle = () => {
    if (!deleteId) return;
    startTransition(async () => {
      try {
        await deleteEnquiry(deleteId);
        toast({ title: "Enquiry deleted", description: "The enquiry has been removed." });
        setDeleteId(null);
        router.refresh();
      } catch {
        toast({ variant: "destructive", title: "Error", description: "Failed to delete enquiry." });
      }
    });
  };

  const handleBulkDelete = () => {
    startTransition(async () => {
      try {
        await bulkDeleteEnquiries(Array.from(selectedRows));
        toast({ title: "Enquiries deleted", description: `${selectedRows.size} enquiry(ies) deleted.` });
        setSelectedRows(new Set());
        setShowBulkDelete(false);
        router.refresh();
      } catch {
        toast({ variant: "destructive", title: "Error", description: "Failed to delete enquiries." });
      }
    });
  };

  // Bulk assign state
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [bulkAssignAgentId, setBulkAssignAgentId] = useState("");
  const [bulkAssignLoading, setBulkAssignLoading] = useState(false);

  const handleBulkAssign = async () => {
    if (!bulkAssignAgentId) return;
    setBulkAssignLoading(true);
    try {
      await bulkAssignEnquiries(Array.from(selectedRows), bulkAssignAgentId);
      toast({ title: "Consultant assigned", description: `${selectedRows.size} enquiry(ies) assigned.` });
      setSelectedRows(new Set());
      setShowBulkAssign(false);
      setBulkAssignAgentId("");
      startTransition(() => router.refresh());
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to assign enquiries." });
    } finally {
      setBulkAssignLoading(false);
    }
  };

  // Reallocate dialog state
  const [reallocateOpen, setReallocateOpen] = useState(false);
  const [reallocateEnquiry, setReallocateEnquiry] = useState<EnquiryRow | null>(null);
  const [reallocateAgentId, setReallocateAgentId] = useState("");
  const [reallocateLoading, setReallocateLoading] = useState(false);

  // Raise Booking dialog state
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingEnquiry, setBookingEnquiry] = useState<EnquiryRow | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingData, setBookingData] = useState({
    propertyId: "",
    bookingDate: "",
    bookingType: "PROPERTY_VIEWING" as string,
    notes: "",
  });

  // Convert to client state (used inside booking dialog)
  const [convertLoading, setConvertLoading] = useState(false);
  const [convertData, setConvertData] = useState({
    nationality: "",
    country: "",
    budgetMin: 200000,
    budgetMax: 500000,
  });

  // Reallocate handlers
  const openReallocate = (enquiry: EnquiryRow) => {
    setReallocateEnquiry(enquiry);
    setReallocateAgentId("");
    setReallocateOpen(true);
  };

  const handleReallocate = async () => {
    if (!reallocateEnquiry || !reallocateAgentId) return;
    setReallocateLoading(true);
    try {
      const isPool = reallocateAgentId.startsWith("POOL_");
      if (isPool) {
        await updateEnquiryField(reallocateEnquiry.id, "assignedAgentId", null);
        await updateEnquiryField(
          reallocateEnquiry.id,
          "tags",
          [...(reallocateEnquiry.tags || []).filter((t: string) => !t.startsWith("POOL_")), reallocateAgentId],
        );
      } else {
        await updateEnquiryField(reallocateEnquiry.id, "assignedAgentId", reallocateAgentId);
      }
      toast({
        title: "Lead reallocated",
        description: isPool
          ? `Moved to ${reallocateAgentId.replace("_", " ")}.`
          : `${reallocateEnquiry.firstName} ${reallocateEnquiry.lastName} reassigned.`,
      });
      setReallocateOpen(false);
      startTransition(() => router.refresh());
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reallocate",
      });
    } finally {
      setReallocateLoading(false);
    }
  };

  // Raise Booking handlers
  const openBooking = (enquiry: EnquiryRow) => {
    setBookingEnquiry(enquiry);
    setBookingData({ propertyId: "", bookingDate: "", bookingType: "PROPERTY_VIEWING", notes: "" });
    setBookingOpen(true);
  };

  const handleRaiseBooking = async () => {
    if (!bookingEnquiry || !bookingData.propertyId || !bookingData.bookingDate) return;
    if (!bookingEnquiry.convertedClientId) {
      toast({ variant: "destructive", title: "Client required", description: "Convert to client before raising a booking." });
      return;
    }
    setBookingLoading(true);
    try {
      await createBooking({
        clientId: bookingEnquiry.convertedClientId,
        propertyId: bookingData.propertyId,
        agentId: bookingEnquiry.assignedAgentId || "",
        bookingDate: new Date(bookingData.bookingDate),
        bookingType: bookingData.bookingType as "PROPERTY_VIEWING" | "FOLLOW_UP_MEETING" | "DOCUMENT_SIGNING" | "TITLE_DEED",
        status: "SCHEDULED",
        notes: bookingData.notes || undefined,
      });
      toast({ title: "Booking created", description: `Booking raised for ${bookingEnquiry.firstName} ${bookingEnquiry.lastName}.` });
      setBookingOpen(false);
      startTransition(() => router.refresh());
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: error instanceof Error ? error.message : "Failed to create booking" });
    } finally {
      setBookingLoading(false);
    }
  };

  const handleConvertToClient = async (enquiryId: string) => {
    setConvertLoading(true);
    try {
      const { client } = await convertToClient(enquiryId, convertData);
      toast({ title: "Converted to client", description: `${client.firstName} ${client.lastName} is now a client.` });
      if (bookingEnquiry) {
        setBookingEnquiry({ ...bookingEnquiry, convertedClientId: client.id });
      }
      setConvertData({ nationality: "", country: "", budgetMin: 200000, budgetMax: 500000 });
      startTransition(() => router.refresh());
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: error instanceof Error ? error.message : "Failed to convert" });
    } finally {
      setConvertLoading(false);
    }
  };

  if (enquiries.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">No enquiries found.</p>
        <div className="mt-4">
          <AddEnquiryDialog agents={agents} properties={properties} />
        </div>
      </div>
    );
  }

  function handleExportCSV() {
    const csv = generateCSV(enquiries as unknown as Record<string, unknown>[], [
      { key: "id", header: "ID" },
      { key: "firstName", header: "First Name" },
      { key: "lastName", header: "Last Name" },
      { key: "email", header: "Email" },
      { key: "phone", header: "Phone" },
      { key: "source", header: "Source" },
      { key: "status", header: "Status" },
      { key: "budget", header: "Budget" },
      { key: "country", header: "Country" },
      { key: "priority", header: "Priority" },
      { key: "called", header: "Called" },
      { key: "spoken", header: "Spoken" },
      { key: "assignedAgent.firstName", header: "Agent First Name" },
      { key: "assignedAgent.lastName", header: "Agent Last Name" },
      { key: "createdAt", header: "Created" },
    ]);
    downloadCSV(csv, `enquiries-export-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  // Helper: format date string to YYYY-MM-DD for date inputs
  function toDateInput(iso: string | null) {
    if (!iso) return "";
    return iso.slice(0, 10);
  }

  return (
    <>
      {/* Bulk Action Bar */}
      {canDelete && selectedRows.size > 0 && (
        <div className="flex items-center gap-3 border-b border-red-200 bg-red-50 px-4 py-2">
          <span className="text-sm font-medium text-red-700">{selectedRows.size} selected</span>
          <Button size="sm" variant="outline" onClick={() => setShowBulkAssign(true)}>
            <UserPlus className="h-4 w-4 mr-1" />
            Assign Consultant
          </Button>
          <Button size="sm" variant="destructive" onClick={() => setShowBulkDelete(true)}>
            <Trash2 className="h-4 w-4 mr-1" />
            Delete Selected
          </Button>
        </div>
      )}
      {canDelete && (
        <div className="flex items-center justify-end px-4 py-2 border-b border-gray-100">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-1" />
            Export CSV
          </Button>
        </div>
      )}

      {/* Column Headers */}
      <div className="grid border-b border-gray-200 bg-gray-50 text-[10px] font-semibold uppercase tracking-wider text-gray-500"
        style={{ gridTemplateColumns: canDelete ? "40px 40px 185px 1fr 205px 180px" : "40px 185px 1fr 205px 180px" }}
      >
        {canDelete && (
          <div className="flex items-center justify-center px-2 py-2.5">
            <Checkbox
              checked={selectedRows.size === enquiries.length && enquiries.length > 0}
              onCheckedChange={toggleSelectAll}
            />
          </div>
        )}
        <div className="px-2 py-2.5 border-l border-gray-200">ID</div>
        <div className="px-3 py-2.5 border-l border-gray-200">Info</div>
        <div className="px-3 py-2.5 border-l border-gray-200">Client Details</div>
        <div className="px-3 py-2.5 border-l border-gray-200">Status & Dates</div>
        <div className="px-3 py-2.5 border-l border-gray-200">Consultant</div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-gray-100">
        {enquiries.map((enquiry, index) => {
          const refId = `${10000 + (currentPage - 1) * 25 + index + 1}`;
          const nextCall = localNextCallOverrides[enquiry.id] !== undefined
            ? localNextCallOverrides[enquiry.id]
            : toDateInput(enquiry.nextCallDate);
          const isPastCall = enquiry.nextCallDate && new Date(enquiry.nextCallDate) < new Date(new Date().setHours(0, 0, 0, 0));

          return (
            <div
              key={enquiry.id}
              className={`grid hover:bg-gray-50/60 transition-colors ${isPastCall ? "bg-amber-50/40" : "bg-white"}`}
              style={{ gridTemplateColumns: canDelete ? "40px 40px 185px 1fr 205px 180px" : "40px 185px 1fr 205px 180px" }}
            >
              {/* Checkbox */}
              {canDelete && (
                <div className="flex items-start justify-center pt-3 px-2">
                  <Checkbox
                    checked={selectedRows.has(enquiry.id)}
                    onCheckedChange={() => toggleSelectRow(enquiry.id)}
                  />
                </div>
              )}

              {/* ID */}
              <div className="flex flex-col items-center justify-start gap-1 px-2 pt-3 border-l border-gray-100">
                <span className="text-[11px] font-bold text-gray-400">{refId}</span>
                {enquiry.convertedClientId && (
                  <span className="rounded-full bg-green-100 px-1 py-0.5 text-[8px] font-medium text-green-700">CV</span>
                )}
              </div>

              {/* INFO */}
              <div className="px-3 py-3 border-l border-gray-100 space-y-1.5 min-w-0">
                <a
                  href={`mailto:${enquiry.email}`}
                  className="block text-xs text-[#dc2626] hover:underline truncate font-medium"
                  title={enquiry.email}
                >
                  <Mail className="inline h-3 w-3 mr-1 shrink-0" />
                  {enquiry.email}
                </a>
                <a
                  href={`tel:${enquiry.phone}`}
                  className="block text-xs text-[#dc2626] hover:underline"
                >
                  <Phone className="inline h-3 w-3 mr-1 shrink-0" />
                  {enquiry.phone}
                </a>
                <div>
                  <span className={`inline-flex rounded px-1.5 py-0.5 text-[9px] font-medium ${sourceBgColors[enquiry.source] || "bg-gray-100 text-gray-700"}`}>
                    {sourceLabels[enquiry.source] || enquiry.source}
                  </span>
                </div>
                {enquiry.budget && (
                  <p className="text-[10px] text-gray-500">Budget: <span className="font-medium text-gray-700">{enquiry.budget}</span></p>
                )}
                {enquiry.country && (
                  <p className="text-[10px] font-semibold text-gray-700">{enquiry.country}</p>
                )}
                <p className="text-[10px] text-gray-400">
                  {new Date(enquiry.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                </p>
              </div>

              {/* CLIENT DETAILS */}
              <div className="px-3 py-3 border-l border-gray-100 space-y-2 min-w-0">
                {/* Name + view link */}
                <div className="flex items-start justify-between gap-1">
                  <Link
                    href={`/clients/enquiries/${enquiry.id}`}
                    className="text-sm font-semibold text-gray-900 hover:text-[#dc2626] hover:underline leading-tight line-clamp-1"
                  >
                    {enquiry.firstName} {enquiry.lastName}
                  </Link>
                  <Link
                    href={`/clients/enquiries/${enquiry.id}`}
                    className="shrink-0 rounded p-1 text-gray-400 hover:text-[#dc2626] hover:bg-gray-100"
                    title="View Details"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Link>
                </div>

                {/* Latest note */}
                {enquiry.notes && enquiry.notes.length > 0 ? (
                  <div className="text-[11px] text-gray-600">
                    <p className="line-clamp-2 leading-snug">{enquiry.notes[0].content}</p>
                    <p className="mt-0.5 text-[10px] text-gray-400">
                      {enquiry.notes[0].agent.firstName} {enquiry.notes[0].agent.lastName} &middot;{" "}
                      {new Date(enquiry.notes[0].createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                    </p>
                  </div>
                ) : enquiry.message ? (
                  <p className="text-[11px] text-gray-400 line-clamp-2 leading-snug">{enquiry.message}</p>
                ) : null}

                {/* Tags */}
                {enquiry.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {enquiry.tags.map((tag) => (
                      <span key={tag} className="rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[9px] font-medium text-gray-600">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Called / Spoken / Reallocate */}
                <div className="flex items-center flex-wrap gap-2 pt-0.5">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={localCalledOverrides[enquiry.id] ?? enquiry.called}
                      className="h-3 w-3 rounded border-gray-300 accent-[#dc2626]"
                      onChange={async (e) => {
                        const val = e.target.checked;
                        setLocalCalledOverrides((prev) => ({ ...prev, [enquiry.id]: val }));
                        try {
                          await updateEnquiryField(enquiry.id, "called", val);
                        } catch {
                          setLocalCalledOverrides((prev) => { const n = { ...prev }; delete n[enquiry.id]; return n; });
                          toast({ variant: "destructive", title: "Error", description: "Failed to update" });
                        }
                      }}
                    />
                    <span className="text-[10px] text-gray-600">Called</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={localSpokenOverrides[enquiry.id] ?? enquiry.spoken}
                      className="h-3 w-3 rounded border-gray-300 accent-[#dc2626]"
                      onChange={async (e) => {
                        const val = e.target.checked;
                        setLocalSpokenOverrides((prev) => ({ ...prev, [enquiry.id]: val }));
                        try {
                          await updateEnquiryField(enquiry.id, "spoken", val);
                        } catch {
                          setLocalSpokenOverrides((prev) => { const n = { ...prev }; delete n[enquiry.id]; return n; });
                          toast({ variant: "destructive", title: "Error", description: "Failed to update" });
                        }
                      }}
                    />
                    <span className="text-[10px] text-gray-600">Spoken</span>
                  </label>
                  <button
                    onClick={() => openReallocate(enquiry)}
                    className="rounded bg-[#dc2626] px-2 py-0.5 text-[10px] font-medium text-white hover:bg-[#b91c1c] transition-colors"
                  >
                    Reallocate
                  </button>
                </div>
              </div>

              {/* STATUS & DATES */}
              <div className="px-3 py-3 border-l border-gray-100 space-y-2 min-w-0">
                {/* Segment */}
                <div>
                  <p className="text-[10px] text-gray-400 font-medium mb-0.5">Segment:</p>
                  <select
                    className="w-full rounded border border-gray-200 bg-white px-1.5 py-1 text-[11px] text-gray-700 cursor-pointer"
                    value={localSegmentOverrides[enquiry.id] ?? enquiry.segment ?? ""}
                    onChange={async (e) => {
                      const val = e.target.value;
                      setLocalSegmentOverrides((prev) => ({ ...prev, [enquiry.id]: val }));
                      try {
                        await updateEnquiryField(enquiry.id, "segment", val);
                      } catch {
                        setLocalSegmentOverrides((prev) => { const n = { ...prev }; delete n[enquiry.id]; return n; });
                        toast({ variant: "destructive", title: "Error", description: "Failed to update segment" });
                      }
                    }}
                  >
                    <option value="">Select</option>
                    <option value="Buyer">Buyer</option>
                    <option value="Seller">Seller</option>
                    <option value="Investor">Investor</option>
                    <option value="Developer">Developer</option>
                    <option value="Tenant">Tenant</option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <p className="text-[10px] text-gray-400 font-medium mb-0.5">Status:</p>
                  <select
                    className={`w-full rounded border px-1.5 py-1 text-[11px] font-medium cursor-pointer ${statusColors[localStatusOverrides[enquiry.id] ?? enquiry.status] || "bg-gray-50 text-gray-700 border-gray-200"}`}
                    value={localStatusOverrides[enquiry.id] ?? enquiry.status}
                    onChange={async (e) => {
                      const val = e.target.value;
                      setLocalStatusOverrides((prev) => ({ ...prev, [enquiry.id]: val }));
                      try {
                        await updateEnquiryStatus(enquiry.id, val as EnquiryStatus);
                      } catch {
                        setLocalStatusOverrides((prev) => { const n = { ...prev }; delete n[enquiry.id]; return n; });
                        toast({ variant: "destructive", title: "Error", description: "Failed to update status" });
                      }
                    }}
                  >
                    <option value="NEW">New</option>
                    <option value="ASSIGNED">Assigned</option>
                    <option value="CONTACTED">Contacted</option>
                    <option value="CONVERTED_TO_CLIENT">Converted</option>
                    <option value="SPAM">Spam</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </div>

                {/* Next Call Date */}
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
                      setLocalNextCallOverrides((prev) => ({ ...prev, [enquiry.id]: e.target.value }));
                    }}
                    onBlur={async (e) => {
                      const val = e.target.value;
                      if (!val) return;
                      try {
                        await updateEnquiryField(enquiry.id, "nextCallDate", new Date(val));
                        startTransition(() => router.refresh());
                      } catch {
                        toast({ variant: "destructive", title: "Error", description: "Failed to update next call date" });
                      }
                    }}
                  />
                </div>

                {/* Raise Booking */}
                <button
                  onClick={() => openBooking(enquiry)}
                  className="w-full rounded bg-[#dc2626] px-2 py-1 text-[10px] font-medium text-white hover:bg-[#b91c1c] transition-colors text-center"
                >
                  Raise Booking
                </button>
              </div>

              {/* CONSULTANT */}
              <div className="px-3 py-3 border-l border-gray-100 space-y-2 min-w-0">
                {/* Consultant */}
                <div>
                  <p className="text-[10px] text-gray-400 font-medium mb-0.5">Consultant:</p>
                  <select
                    className="w-full rounded border border-gray-200 bg-white px-1.5 py-1 text-[11px] text-gray-700 cursor-pointer"
                    value={
                      localAgentOverrides[enquiry.id] !== undefined
                        ? localAgentOverrides[enquiry.id]
                        : enquiry.tags?.find((t) => t.startsWith("POOL_")) ||
                          enquiry.assignedAgentId || "unassigned"
                    }
                    onChange={async (e) => {
                      const val = e.target.value;
                      setLocalAgentOverrides((prev) => ({ ...prev, [enquiry.id]: val }));
                      try {
                        if (val.startsWith("POOL_")) {
                          await assignEnquiryToPool(enquiry.id, val);
                        } else {
                          if (enquiry.tags?.some((t) => t.startsWith("POOL_"))) {
                            await removeEnquiryFromPool(enquiry.id);
                          }
                          await updateEnquiryField(enquiry.id, "assignedAgentId", val === "unassigned" ? null : val);
                        }
                        toast({ title: "Consultant updated" });
                      } catch (err) {
                        setLocalAgentOverrides((prev) => { const n = { ...prev }; delete n[enquiry.id]; return n; });
                        toast({ variant: "destructive", title: "Error", description: err instanceof Error ? err.message : "Failed to update consultant" });
                      }
                    }}
                  >
                    <option value="unassigned">Unassigned</option>
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

                {/* Priority */}
                <div>
                  <p className="text-[10px] text-gray-400 font-medium mb-0.5">Priority:</p>
                  <select
                    className={`w-full rounded border px-1.5 py-1 text-[11px] font-medium cursor-pointer ${priorityColors[localPriorityOverrides[enquiry.id] || enquiry.priority || "Medium"] || "border-gray-200 bg-white text-gray-600"}`}
                    value={localPriorityOverrides[enquiry.id] || enquiry.priority || "Medium"}
                    onChange={async (e) => {
                      const val = e.target.value;
                      setLocalPriorityOverrides((prev) => ({ ...prev, [enquiry.id]: val }));
                      try {
                        await updateEnquiryField(enquiry.id, "priority", val);
                        setLocalPriorityOverrides((prev) => { const n = { ...prev }; delete n[enquiry.id]; return n; });
                      } catch {
                        setLocalPriorityOverrides((prev) => { const n = { ...prev }; delete n[enquiry.id]; return n; });
                        toast({ variant: "destructive", title: "Error", description: "Failed to update priority" });
                      }
                    }}
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                {/* Delete */}
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-7 text-red-500 hover:text-red-700 hover:bg-red-50 text-[10px]"
                    onClick={() => setDeleteId(enquiry.id)}
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
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            Showing {(currentPage - 1) * 25 + 1} to {Math.min(currentPage * 25, total)} of {total} enquiries
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => {
                const params = new URLSearchParams(window.location.search);
                params.set("page", String(currentPage - 1));
                router.push(`/clients/enquiries?${params.toString()}`);
              }}
            >
              Previous
            </Button>
            <span className="text-xs text-gray-500">Page {currentPage} of {pages}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= pages}
              onClick={() => {
                const params = new URLSearchParams(window.location.search);
                params.set("page", String(currentPage + 1));
                router.push(`/clients/enquiries?${params.toString()}`);
              }}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* ==================== REALLOCATE DIALOG ==================== */}
      <Dialog open={reallocateOpen} onOpenChange={setReallocateOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Reallocate Lead</DialogTitle>
            <DialogDescription>
              Assign {reallocateEnquiry?.firstName} {reallocateEnquiry?.lastName} to a different consultant
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm font-medium text-gray-900">Current Consultant</p>
              <p className="text-sm text-gray-500">
                {reallocateEnquiry?.assignedAgent
                  ? `${reallocateEnquiry.assignedAgent.firstName} ${reallocateEnquiry.assignedAgent.lastName}`
                  : "Unassigned"}
              </p>
            </div>
            <div className="space-y-2">
              <Label>New Consultant / Pool</Label>
              <Select value={reallocateAgentId} onValueChange={setReallocateAgentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select consultant or pool" />
                </SelectTrigger>
                <SelectContent>
                  {pools.map((pool) => (
                    <SelectItem key={pool.tag} value={pool.tag}>
                      {pool.name} (Unassigned)
                    </SelectItem>
                  ))}
                  {agents
                    .filter((a) => a.id !== reallocateEnquiry?.assignedAgentId)
                    .map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.firstName} {agent.lastName}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReallocateOpen(false)}>Cancel</Button>
            <Button
              onClick={handleReallocate}
              disabled={!reallocateAgentId || reallocateLoading}
              className="bg-[#dc2626] hover:bg-[#b91c1c] text-white"
            >
              {reallocateLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reallocate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== RAISE BOOKING DIALOG ==================== */}
      <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Raise Booking</DialogTitle>
            <DialogDescription>
              Create a property booking for {bookingEnquiry?.firstName} {bookingEnquiry?.lastName}
            </DialogDescription>
          </DialogHeader>

          {bookingEnquiry && !bookingEnquiry.convertedClientId && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
                <UserPlus className="h-4 w-4" />
                Convert to Client First
              </div>
              <p className="text-xs text-amber-700">
                This enquiry needs to be converted to a client before raising a booking.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-amber-800">Nationality</Label>
                  <Select value={convertData.nationality} onValueChange={(val) => setConvertData((p) => ({ ...p, nationality: val }))}>
                    <SelectTrigger className="h-8 text-xs bg-white">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {["Bangladeshi", "British", "Emirati", "Indian", "Iranian", "Iraqi", "Kuwaiti", "Malaysian", "Pakistani", "Saudi", "Turkish", "Other"].map((n) => (
                        <SelectItem key={n} value={n}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-amber-800">Country</Label>
                  <Select value={convertData.country} onValueChange={(val) => setConvertData((p) => ({ ...p, country: val }))}>
                    <SelectTrigger className="h-8 text-xs bg-white">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {["Bangladesh", "India", "Iran", "Iraq", "Kuwait", "Malaysia", "Pakistan", "Saudi Arabia", "Turkey", "UAE", "United Kingdom", "Other"].map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => handleConvertToClient(bookingEnquiry.id)}
                disabled={convertLoading}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white text-xs h-8"
              >
                {convertLoading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <UserPlus className="mr-2 h-3 w-3" />}
                Convert to Client & Continue
              </Button>
            </div>
          )}

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Property <span className="text-red-500">*</span></Label>
              <Select value={bookingData.propertyId} onValueChange={(val) => setBookingData((prev) => ({ ...prev, propertyId: val }))}>
                <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                <SelectContent>
                  {properties.map((prop) => (
                    <SelectItem key={prop.id} value={prop.id}>{prop.name} ({prop.pqtNumber})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Booking Date <span className="text-red-500">*</span></Label>
              <Input
                type="datetime-local"
                value={bookingData.bookingDate}
                onChange={(e) => setBookingData((prev) => ({ ...prev, bookingDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Booking Type</Label>
              <Select value={bookingData.bookingType} onValueChange={(val) => setBookingData((prev) => ({ ...prev, bookingType: val }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PROPERTY_VIEWING">Property Viewing</SelectItem>
                  <SelectItem value="FOLLOW_UP_MEETING">Follow-up Meeting</SelectItem>
                  <SelectItem value="DOCUMENT_SIGNING">Document Signing</SelectItem>
                  <SelectItem value="TITLE_DEED">Title Deed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Any additional notes..."
                value={bookingData.notes}
                onChange={(e) => setBookingData((prev) => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBookingOpen(false)}>Cancel</Button>
            <Button
              onClick={handleRaiseBooking}
              disabled={!bookingData.propertyId || !bookingData.bookingDate || !bookingEnquiry?.convertedClientId || bookingLoading}
              className="bg-[#dc2626] hover:bg-[#b91c1c] text-white"
            >
              {bookingLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Raise Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Single Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Enquiry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this enquiry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSingle} className="bg-red-600 hover:bg-red-700 text-white">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Dialog */}
      <AlertDialog open={showBulkDelete} onOpenChange={setShowBulkDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedRows.size} Enquiry(ies)</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedRows.size} selected enquiry(ies)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-700 text-white">
              Delete {selectedRows.size} Enquiry(ies)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Assign Dialog */}
      <Dialog open={showBulkAssign} onOpenChange={setShowBulkAssign}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Assign Consultant</DialogTitle>
            <DialogDescription>
              Assign {selectedRows.size} selected enquiry(ies) to a consultant
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Consultant</Label>
              <Select value={bulkAssignAgentId} onValueChange={setBulkAssignAgentId}>
                <SelectTrigger><SelectValue placeholder="Select consultant" /></SelectTrigger>
                <SelectContent>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.firstName} {agent.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkAssign(false)}>Cancel</Button>
            <Button
              onClick={handleBulkAssign}
              disabled={!bulkAssignAgentId || bulkAssignLoading}
              className="bg-[#dc2626] hover:bg-[#b91c1c] text-white"
            >
              {bulkAssignLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign {selectedRows.size} Enquiry(ies)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
