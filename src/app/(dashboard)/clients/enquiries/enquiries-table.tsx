"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
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
import { toast } from "@/components/ui/use-toast";
import {
  CheckSquare,
  Square,
  Phone,
  Mail,
  Calendar,
  Eye,
  Loader2,
  UserPlus,
  Download,
} from "lucide-react";
import {
  updateEnquiryField,
  convertToClient,
  assignEnquiryToPool,
  removeEnquiryFromPool,
} from "@/lib/actions/enquiries";
import { createBooking } from "@/lib/actions/bookings";
import { createSale } from "@/lib/actions/sales";
import { generateCSV, downloadCSV } from "@/lib/export";

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

interface EnquiriesTableProps {
  enquiries: EnquiryRow[];
  agents: Agent[];
  properties: Property[];
  total: number;
  pages: number;
  currentPage: number;
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

const statusColors: Record<string, string> = {
  Hot: "text-red-600",
  Warm: "text-orange-500",
  Cold: "text-blue-500",
  New: "text-gray-500",
};

const priorityColors: Record<string, string> = {
  High: "text-red-600 bg-red-50",
  Medium: "text-orange-600 bg-orange-50",
  Low: "text-green-600 bg-green-50",
};

export function EnquiriesTable({
  enquiries,
  agents,
  properties,
  total,
  pages,
  currentPage,
}: EnquiriesTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Reallocate dialog state
  const [reallocateOpen, setReallocateOpen] = useState(false);
  const [reallocateEnquiry, setReallocateEnquiry] = useState<EnquiryRow | null>(
    null,
  );
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

  // Sale Details dialog state
  const [saleOpen, setSaleOpen] = useState(false);
  const [saleEnquiry, setSaleEnquiry] = useState<EnquiryRow | null>(null);
  const [saleLoading, setSaleLoading] = useState(false);
  const [saleData, setSaleData] = useState({
    propertyId: "",
    unitNumber: "",
    salePrice: "",
    currency: "USD" as string,
    depositAmount: "",
    notes: "",
  });

  // Convert to client state
  const [convertLoading, setConvertLoading] = useState(false);
  const [convertData, setConvertData] = useState({
    nationality: "",
    country: "",
    budgetMin: 200000,
    budgetMax: 500000,
  });

  const handleFieldUpdate = async (
    enquiryId: string,
    field: string,
    value: string | boolean | Date | null,
  ) => {
    try {
      await updateEnquiryField(enquiryId, field, value);
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to update field",
      });
    }
  };

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
      await updateEnquiryField(
        reallocateEnquiry.id,
        "assignedAgentId",
        reallocateAgentId,
      );
      toast({
        title: "Lead reallocated",
        description: `${reallocateEnquiry.firstName} ${reallocateEnquiry.lastName} has been reassigned.`,
      });
      setReallocateOpen(false);
      startTransition(() => router.refresh());
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to reallocate",
      });
    } finally {
      setReallocateLoading(false);
    }
  };

  // Raise Booking handlers
  const openBooking = (enquiry: EnquiryRow) => {
    setBookingEnquiry(enquiry);
    setBookingData({
      propertyId: "",
      bookingDate: "",
      bookingType: "PROPERTY_VIEWING",
      notes: "",
    });
    setBookingOpen(true);
  };

  const handleRaiseBooking = async () => {
    if (!bookingEnquiry || !bookingData.propertyId || !bookingData.bookingDate)
      return;

    if (!bookingEnquiry.convertedClientId) {
      toast({
        variant: "destructive",
        title: "Client required",
        description:
          "This enquiry must be converted to a client before raising a booking.",
      });
      return;
    }

    setBookingLoading(true);
    try {
      await createBooking({
        clientId: bookingEnquiry.convertedClientId,
        propertyId: bookingData.propertyId,
        agentId: bookingEnquiry.assignedAgentId || "",
        bookingDate: new Date(bookingData.bookingDate),
        bookingType: bookingData.bookingType as
          | "PROPERTY_VIEWING"
          | "FOLLOW_UP_MEETING"
          | "DOCUMENT_SIGNING"
          | "TITLE_DEED",
        status: "SCHEDULED",
        notes: bookingData.notes || undefined,
      });
      toast({
        title: "Booking created",
        description: `Booking raised for ${bookingEnquiry.firstName} ${bookingEnquiry.lastName}.`,
      });
      setBookingOpen(false);
      startTransition(() => router.refresh());
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to create booking",
      });
    } finally {
      setBookingLoading(false);
    }
  };

  // Sale Details handlers
  const openSale = (enquiry: EnquiryRow) => {
    setSaleEnquiry(enquiry);
    setSaleData({
      propertyId: "",
      unitNumber: "",
      salePrice: "",
      currency: "USD",
      depositAmount: "",
      notes: "",
    });
    setSaleOpen(true);
  };

  const handleCreateSale = async () => {
    if (!saleEnquiry || !saleData.propertyId || !saleData.salePrice) return;

    if (!saleEnquiry.convertedClientId) {
      toast({
        variant: "destructive",
        title: "Client required",
        description:
          "This enquiry must be converted to a client before recording a sale.",
      });
      return;
    }

    setSaleLoading(true);
    try {
      await createSale({
        clientId: saleEnquiry.convertedClientId,
        propertyId: saleData.propertyId,
        agentId: saleEnquiry.assignedAgentId || "",
        unitNumber: saleData.unitNumber || undefined,
        salePrice: parseFloat(saleData.salePrice),
        currency: saleData.currency as "USD" | "EUR" | "GBP" | "TRY" | "AED",
        depositAmount: saleData.depositAmount
          ? parseFloat(saleData.depositAmount)
          : undefined,
        citizenshipEligible: parseFloat(saleData.salePrice) >= 400000,
        notes: saleData.notes || undefined,
      });
      toast({
        title: "Sale recorded",
        description: `Sale recorded for ${saleEnquiry.firstName} ${saleEnquiry.lastName}.`,
      });
      setSaleOpen(false);
      startTransition(() => router.refresh());
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to record sale",
      });
    } finally {
      setSaleLoading(false);
    }
  };

  // Convert to client handler (inline within booking/sale dialogs)
  const handleConvertToClient = async (
    enquiryId: string,
    context: "booking" | "sale",
  ) => {
    setConvertLoading(true);
    try {
      const { client } = await convertToClient(enquiryId, convertData);
      toast({
        title: "Converted to client",
        description: `${client.firstName} ${client.lastName} is now a client. You can proceed.`,
      });
      // Update the local enquiry reference so the form unlocks
      if (context === "booking" && bookingEnquiry) {
        setBookingEnquiry({ ...bookingEnquiry, convertedClientId: client.id });
      } else if (context === "sale" && saleEnquiry) {
        setSaleEnquiry({ ...saleEnquiry, convertedClientId: client.id });
      }
      setConvertData({
        nationality: "",
        country: "",
        budgetMin: 200000,
        budgetMax: 500000,
      });
      startTransition(() => router.refresh());
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to convert",
      });
    } finally {
      setConvertLoading(false);
    }
  };

  if (enquiries.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">No enquiries found.</p>
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
    downloadCSV(
      csv,
      `enquiries-export-${new Date().toISOString().slice(0, 10)}.csv`,
    );
  }

  return (
    <>
      <div className="flex items-center justify-end px-4 py-2">
        <Button variant="outline" size="sm" onClick={handleExportCSV}>
          <Download className="h-4 w-4 mr-1" />
          Export CSV
        </Button>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-gray-100">
              <TableHead className="text-[10px] font-medium text-gray-500 uppercase whitespace-nowrap">
                ID
              </TableHead>
              <TableHead className="text-[10px] font-medium text-gray-500 uppercase whitespace-nowrap min-w-[160px]">
                Client Name
              </TableHead>
              <TableHead className="text-[10px] font-medium text-gray-500 uppercase whitespace-nowrap">
                Email
              </TableHead>
              <TableHead className="text-[10px] font-medium text-gray-500 uppercase whitespace-nowrap">
                Phone
              </TableHead>
              <TableHead className="text-[10px] font-medium text-gray-500 uppercase whitespace-nowrap">
                Source
              </TableHead>
              <TableHead className="text-[10px] font-medium text-gray-500 uppercase whitespace-nowrap">
                Budget
              </TableHead>
              <TableHead className="text-[10px] font-medium text-gray-500 uppercase whitespace-nowrap">
                Country
              </TableHead>
              <TableHead className="text-[10px] font-medium text-gray-500 uppercase whitespace-nowrap">
                Notes
              </TableHead>
              <TableHead className="text-[10px] font-medium text-gray-500 uppercase whitespace-nowrap text-center">
                Called
              </TableHead>
              <TableHead className="text-[10px] font-medium text-gray-500 uppercase whitespace-nowrap text-center">
                Spoken
              </TableHead>
              <TableHead className="text-[10px] font-medium text-gray-500 uppercase whitespace-nowrap">
                Segment
              </TableHead>
              <TableHead className="text-[10px] font-medium text-gray-500 uppercase whitespace-nowrap">
                Status
              </TableHead>
              <TableHead className="text-[10px] font-medium text-gray-500 uppercase whitespace-nowrap">
                Next Call
              </TableHead>
              <TableHead className="text-[10px] font-medium text-gray-500 uppercase whitespace-nowrap">
                Snooze
              </TableHead>
              <TableHead className="text-[10px] font-medium text-gray-500 uppercase whitespace-nowrap">
                Priority
              </TableHead>
              <TableHead className="text-[10px] font-medium text-gray-500 uppercase whitespace-nowrap">
                Consultant
              </TableHead>
              <TableHead className="text-[10px] font-medium text-gray-500 uppercase whitespace-nowrap">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {enquiries.map((enquiry, index) => {
              const refId = `REF-${(10001 + index).toString()}`;

              return (
                <TableRow
                  key={enquiry.id}
                  className="border-b border-gray-50 hover:bg-gray-50/50"
                >
                  {/* ID */}
                  <TableCell className="text-xs font-medium text-gray-500 whitespace-nowrap">
                    {refId}
                  </TableCell>

                  {/* Client Name + Tags */}
                  <TableCell>
                    <div>
                      <Link
                        href={`/clients/enquiries/${enquiry.id}`}
                        className="text-xs font-medium text-gray-900 hover:text-[#dc2626] hover:underline"
                      >
                        {enquiry.firstName} {enquiry.lastName}
                      </Link>
                      {enquiry.tags.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {enquiry.tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[9px] font-medium text-gray-600"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </TableCell>

                  {/* Email */}
                  <TableCell className="text-xs text-gray-600 whitespace-nowrap">
                    {enquiry.email}
                  </TableCell>

                  {/* Phone */}
                  <TableCell className="text-xs text-gray-600 whitespace-nowrap">
                    {enquiry.phone}
                  </TableCell>

                  {/* Source */}
                  <TableCell>
                    <span
                      className={`inline-flex rounded px-2 py-0.5 text-[10px] font-medium whitespace-nowrap ${sourceBgColors[enquiry.source] || "bg-gray-100 text-gray-700"}`}
                    >
                      {sourceLabels[enquiry.source] || enquiry.source}
                    </span>
                  </TableCell>

                  {/* Budget */}
                  <TableCell className="text-xs text-gray-600 whitespace-nowrap">
                    {enquiry.budget || "—"}
                  </TableCell>

                  {/* Country */}
                  <TableCell className="text-xs text-gray-600 whitespace-nowrap">
                    {enquiry.country || "—"}
                  </TableCell>

                  {/* Notes */}
                  <TableCell className="text-xs text-gray-500 max-w-[140px] truncate">
                    {enquiry.message || "—"}
                  </TableCell>

                  {/* Called */}
                  <TableCell className="text-center">
                    <button
                      onClick={() =>
                        handleFieldUpdate(enquiry.id, "called", !enquiry.called)
                      }
                      className="mx-auto block"
                    >
                      {enquiry.called ? (
                        <CheckSquare className="h-4 w-4 text-[#dc2626]" />
                      ) : (
                        <Square className="h-4 w-4 text-gray-300" />
                      )}
                    </button>
                  </TableCell>

                  {/* Spoken */}
                  <TableCell className="text-center">
                    <button
                      onClick={() =>
                        handleFieldUpdate(enquiry.id, "spoken", !enquiry.spoken)
                      }
                      className="mx-auto block"
                    >
                      {enquiry.spoken ? (
                        <CheckSquare className="h-4 w-4 text-[#dc2626]" />
                      ) : (
                        <Square className="h-4 w-4 text-gray-300" />
                      )}
                    </button>
                  </TableCell>

                  {/* Segment */}
                  <TableCell>
                    <select
                      className="rounded border border-gray-200 bg-white px-1.5 py-1 text-[11px] text-gray-600 cursor-pointer"
                      value={enquiry.segment || "Buyer"}
                      onChange={(e) =>
                        handleFieldUpdate(enquiry.id, "segment", e.target.value)
                      }
                    >
                      <option value="Buyer">Buyer</option>
                      <option value="Investor">Investor</option>
                      <option value="Tenant">Tenant</option>
                    </select>
                  </TableCell>

                  {/* Status (leadStatus) */}
                  <TableCell>
                    <select
                      className={`rounded border border-gray-200 bg-white px-1.5 py-1 text-[11px] font-medium cursor-pointer ${statusColors[enquiry.leadStatus || "New"] || "text-gray-600"}`}
                      value={enquiry.leadStatus || "New"}
                      onChange={(e) =>
                        handleFieldUpdate(
                          enquiry.id,
                          "leadStatus",
                          e.target.value,
                        )
                      }
                    >
                      <option value="Hot">Hot</option>
                      <option value="Warm">Warm</option>
                      <option value="Cold">Cold</option>
                      <option value="New">New</option>
                    </select>
                  </TableCell>

                  {/* Next Call */}
                  <TableCell>
                    <input
                      type="date"
                      className="rounded border border-gray-200 bg-white px-1.5 py-1 text-[11px] text-gray-600 cursor-pointer"
                      value={
                        enquiry.nextCallDate
                          ? new Date(enquiry.nextCallDate)
                              .toISOString()
                              .split("T")[0]
                          : ""
                      }
                      onChange={(e) => {
                        const val = e.target.value
                          ? new Date(e.target.value)
                          : null;
                        handleFieldUpdate(enquiry.id, "nextCallDate", val);
                      }}
                    />
                  </TableCell>

                  {/* Snooze */}
                  <TableCell>
                    <select
                      className="rounded border border-gray-200 bg-white px-1.5 py-1 text-[11px] text-gray-600 cursor-pointer"
                      value={enquiry.snooze || "Active"}
                      onChange={(e) =>
                        handleFieldUpdate(enquiry.id, "snooze", e.target.value)
                      }
                    >
                      <option value="Active">Active</option>
                      <option value="1 Day">1 Day</option>
                      <option value="3 Days">3 Days</option>
                      <option value="1 Week">1 Week</option>
                      <option value="2 Weeks">2 Weeks</option>
                      <option value="1 Month">1 Month</option>
                    </select>
                  </TableCell>

                  {/* Priority */}
                  <TableCell>
                    <select
                      className={`rounded border border-gray-200 px-1.5 py-1 text-[11px] font-medium cursor-pointer ${priorityColors[enquiry.priority || "Medium"] || "text-gray-600 bg-white"}`}
                      value={enquiry.priority || "Medium"}
                      onChange={(e) =>
                        handleFieldUpdate(
                          enquiry.id,
                          "priority",
                          e.target.value,
                        )
                      }
                    >
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </TableCell>

                  {/* Consultant */}
                  <TableCell>
                    <select
                      className="rounded border border-gray-200 bg-white px-1.5 py-1 text-[11px] text-gray-600 cursor-pointer min-w-[110px]"
                      value={
                        enquiry.tags?.includes("POOL_1")
                          ? "POOL_1"
                          : enquiry.tags?.includes("POOL_2")
                            ? "POOL_2"
                            : enquiry.tags?.includes("POOL_3")
                              ? "POOL_3"
                              : enquiry.assignedAgentId || "unassigned"
                      }
                      onChange={async (e) => {
                        const val = e.target.value;
                        if (
                          val === "POOL_1" ||
                          val === "POOL_2" ||
                          val === "POOL_3"
                        ) {
                          await assignEnquiryToPool(enquiry.id, val);
                          startTransition(() => router.refresh());
                        } else {
                          if (
                            enquiry.tags?.some((t) => t.startsWith("POOL_"))
                          ) {
                            await removeEnquiryFromPool(enquiry.id);
                          }
                          const agentVal = val === "unassigned" ? null : val;
                          handleFieldUpdate(
                            enquiry.id,
                            "assignedAgentId",
                            agentVal,
                          );
                        }
                      }}
                    >
                      <option value="unassigned">Unassigned</option>
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
                      <Link
                        href={`/clients/enquiries/${enquiry.id}`}
                        className="rounded p-1 hover:bg-gray-100 text-gray-500 hover:text-[#dc2626] transition-colors"
                        title="View Details"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Link>
                      <button
                        className="rounded p-1 hover:bg-gray-100 text-gray-500 hover:text-[#dc2626] transition-colors"
                        title="Call"
                      >
                        <Phone className="h-3.5 w-3.5" />
                      </button>
                      <button
                        className="rounded p-1 hover:bg-gray-100 text-gray-500 hover:text-[#dc2626] transition-colors"
                        title="Email"
                      >
                        <Mail className="h-3.5 w-3.5" />
                      </button>
                      <button
                        className="rounded p-1 hover:bg-gray-100 text-gray-500 hover:text-[#dc2626] transition-colors"
                        title="Schedule"
                      >
                        <Calendar className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => openReallocate(enquiry)}
                        className="text-[10px] font-medium text-[#dc2626] hover:underline px-1 whitespace-nowrap"
                      >
                        Reallocate
                      </button>
                      <Button
                        size="sm"
                        onClick={() => openBooking(enquiry)}
                        className="h-6 px-2 text-[10px] bg-[#dc2626] hover:bg-[#b91c1c] text-white whitespace-nowrap"
                      >
                        Raise Booking
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openSale(enquiry)}
                        className="h-6 px-2 text-[10px] whitespace-nowrap"
                      >
                        Sale Details
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            Showing {(currentPage - 1) * 25 + 1} to{" "}
            {Math.min(currentPage * 25, total)} of {total} enquiries
          </p>
        </div>
      )}

      {/* ==================== REALLOCATE DIALOG ==================== */}
      <Dialog open={reallocateOpen} onOpenChange={setReallocateOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Reallocate Lead</DialogTitle>
            <DialogDescription>
              Assign {reallocateEnquiry?.firstName}{" "}
              {reallocateEnquiry?.lastName} to a different consultant
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm font-medium text-gray-900">
                Current Consultant
              </p>
              <p className="text-sm text-gray-500">
                {reallocateEnquiry?.assignedAgent
                  ? `${reallocateEnquiry.assignedAgent.firstName} ${reallocateEnquiry.assignedAgent.lastName}`
                  : "Unassigned"}
              </p>
            </div>

            <div className="space-y-2">
              <Label>New Consultant</Label>
              <Select
                value={reallocateAgentId}
                onValueChange={setReallocateAgentId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select consultant" />
                </SelectTrigger>
                <SelectContent>
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
            <Button variant="outline" onClick={() => setReallocateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleReallocate}
              disabled={!reallocateAgentId || reallocateLoading}
              className="bg-[#dc2626] hover:bg-[#b91c1c] text-white"
            >
              {reallocateLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
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
              Create a property booking for {bookingEnquiry?.firstName}{" "}
              {bookingEnquiry?.lastName}
            </DialogDescription>
          </DialogHeader>

          {bookingEnquiry && !bookingEnquiry.convertedClientId && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
                <UserPlus className="h-4 w-4" />
                Convert to Client First
              </div>
              <p className="text-xs text-amber-700">
                This enquiry needs to be converted to a client before raising a
                booking.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-amber-800">Nationality</Label>
                  <Select
                    value={convertData.nationality}
                    onValueChange={(val) =>
                      setConvertData((p) => ({ ...p, nationality: val }))
                    }
                  >
                    <SelectTrigger className="h-8 text-xs bg-white">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "Bangladeshi",
                        "British",
                        "Emirati",
                        "Indian",
                        "Iranian",
                        "Iraqi",
                        "Kuwaiti",
                        "Malaysian",
                        "Pakistani",
                        "Saudi",
                        "Turkish",
                        "Other",
                      ].map((n) => (
                        <SelectItem key={n} value={n}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-amber-800">Country</Label>
                  <Select
                    value={convertData.country}
                    onValueChange={(val) =>
                      setConvertData((p) => ({ ...p, country: val }))
                    }
                  >
                    <SelectTrigger className="h-8 text-xs bg-white">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "Bangladesh",
                        "India",
                        "Iran",
                        "Iraq",
                        "Kuwait",
                        "Malaysia",
                        "Pakistan",
                        "Saudi Arabia",
                        "Turkey",
                        "UAE",
                        "United Kingdom",
                        "Other",
                      ].map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() =>
                  handleConvertToClient(bookingEnquiry.id, "booking")
                }
                disabled={convertLoading}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white text-xs h-8"
              >
                {convertLoading ? (
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                ) : (
                  <UserPlus className="mr-2 h-3 w-3" />
                )}
                Convert to Client & Continue
              </Button>
            </div>
          )}

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>
                Property <span className="text-red-500">*</span>
              </Label>
              <Select
                value={bookingData.propertyId}
                onValueChange={(val) =>
                  setBookingData((prev) => ({ ...prev, propertyId: val }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((prop) => (
                    <SelectItem key={prop.id} value={prop.id}>
                      {prop.name} ({prop.pqtNumber})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>
                Booking Date <span className="text-red-500">*</span>
              </Label>
              <Input
                type="datetime-local"
                value={bookingData.bookingDate}
                onChange={(e) =>
                  setBookingData((prev) => ({
                    ...prev,
                    bookingDate: e.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Booking Type</Label>
              <Select
                value={bookingData.bookingType}
                onValueChange={(val) =>
                  setBookingData((prev) => ({ ...prev, bookingType: val }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PROPERTY_VIEWING">
                    Property Viewing
                  </SelectItem>
                  <SelectItem value="FOLLOW_UP_MEETING">
                    Follow-up Meeting
                  </SelectItem>
                  <SelectItem value="DOCUMENT_SIGNING">
                    Document Signing
                  </SelectItem>
                  <SelectItem value="TITLE_DEED">Title Deed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Any additional notes..."
                value={bookingData.notes}
                onChange={(e) =>
                  setBookingData((prev) => ({ ...prev, notes: e.target.value }))
                }
                rows={3}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBookingOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRaiseBooking}
              disabled={
                !bookingData.propertyId ||
                !bookingData.bookingDate ||
                !bookingEnquiry?.convertedClientId ||
                bookingLoading
              }
              className="bg-[#dc2626] hover:bg-[#b91c1c] text-white"
            >
              {bookingLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Raise Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== SALE DETAILS DIALOG ==================== */}
      <Dialog open={saleOpen} onOpenChange={setSaleOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Sale Details</DialogTitle>
            <DialogDescription>
              Record a sale for {saleEnquiry?.firstName} {saleEnquiry?.lastName}
            </DialogDescription>
          </DialogHeader>

          {saleEnquiry && !saleEnquiry.convertedClientId && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
                <UserPlus className="h-4 w-4" />
                Convert to Client First
              </div>
              <p className="text-xs text-amber-700">
                This enquiry needs to be converted to a client before recording
                a sale.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-amber-800">Nationality</Label>
                  <Select
                    value={convertData.nationality}
                    onValueChange={(val) =>
                      setConvertData((p) => ({ ...p, nationality: val }))
                    }
                  >
                    <SelectTrigger className="h-8 text-xs bg-white">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "Bangladeshi",
                        "British",
                        "Emirati",
                        "Indian",
                        "Iranian",
                        "Iraqi",
                        "Kuwaiti",
                        "Malaysian",
                        "Pakistani",
                        "Saudi",
                        "Turkish",
                        "Other",
                      ].map((n) => (
                        <SelectItem key={n} value={n}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-amber-800">Country</Label>
                  <Select
                    value={convertData.country}
                    onValueChange={(val) =>
                      setConvertData((p) => ({ ...p, country: val }))
                    }
                  >
                    <SelectTrigger className="h-8 text-xs bg-white">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "Bangladesh",
                        "India",
                        "Iran",
                        "Iraq",
                        "Kuwait",
                        "Malaysia",
                        "Pakistan",
                        "Saudi Arabia",
                        "Turkey",
                        "UAE",
                        "United Kingdom",
                        "Other",
                      ].map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => handleConvertToClient(saleEnquiry.id, "sale")}
                disabled={convertLoading}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white text-xs h-8"
              >
                {convertLoading ? (
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                ) : (
                  <UserPlus className="mr-2 h-3 w-3" />
                )}
                Convert to Client & Continue
              </Button>
            </div>
          )}

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>
                Property <span className="text-red-500">*</span>
              </Label>
              <Select
                value={saleData.propertyId}
                onValueChange={(val) =>
                  setSaleData((prev) => ({ ...prev, propertyId: val }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((prop) => (
                    <SelectItem key={prop.id} value={prop.id}>
                      {prop.name} ({prop.pqtNumber})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Unit Number</Label>
                <Input
                  placeholder="e.g. A-301"
                  value={saleData.unitNumber}
                  onChange={(e) =>
                    setSaleData((prev) => ({
                      ...prev,
                      unitNumber: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select
                  value={saleData.currency}
                  onValueChange={(val) =>
                    setSaleData((prev) => ({ ...prev, currency: val }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="TRY">TRY</SelectItem>
                    <SelectItem value="AED">AED</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Sale Price <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={saleData.salePrice}
                  onChange={(e) =>
                    setSaleData((prev) => ({
                      ...prev,
                      salePrice: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Deposit Amount</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={saleData.depositAmount}
                  onChange={(e) =>
                    setSaleData((prev) => ({
                      ...prev,
                      depositAmount: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Sale notes, payment plan details..."
                value={saleData.notes}
                onChange={(e) =>
                  setSaleData((prev) => ({ ...prev, notes: e.target.value }))
                }
                rows={3}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSaleOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateSale}
              disabled={
                !saleData.propertyId ||
                !saleData.salePrice ||
                !saleEnquiry?.convertedClientId ||
                saleLoading
              }
              className="bg-[#dc2626] hover:bg-[#b91c1c] text-white"
            >
              {saleLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Record Sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
