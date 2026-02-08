"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { CheckSquare, Square } from "lucide-react";
import { updateEnquiryField } from "@/lib/actions/enquiries";

interface Agent {
  id: string;
  firstName: string;
  lastName: string;
}

interface EnquiryFieldsData {
  id: string;
  called: boolean;
  spoken: boolean;
  segment: string | null;
  leadStatus: string | null;
  priority: string | null;
  nextCallDate: string | null;
  snooze: string | null;
  assignedAgentId: string | null;
}

interface EnquiryDetailFieldsProps {
  enquiry: EnquiryFieldsData;
  agents: Agent[];
}

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

export function EnquiryDetailFields({ enquiry, agents }: EnquiryDetailFieldsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleFieldUpdate = async (
    field: string,
    value: string | boolean | Date | null,
  ) => {
    try {
      await updateEnquiryField(enquiry.id, field, value);
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Lead Management</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Called / Spoken checkboxes */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => handleFieldUpdate("called", !enquiry.called)}
            className="flex items-center gap-2 rounded-lg border border-gray-200 p-3 hover:bg-gray-50 transition-colors text-left"
          >
            {enquiry.called ? (
              <CheckSquare className="h-5 w-5 text-[#dc2626]" />
            ) : (
              <Square className="h-5 w-5 text-gray-300" />
            )}
            <div>
              <p className="text-xs text-gray-500">Called</p>
              <p className="text-sm font-medium">{enquiry.called ? "Yes" : "No"}</p>
            </div>
          </button>

          <button
            onClick={() => handleFieldUpdate("spoken", !enquiry.spoken)}
            className="flex items-center gap-2 rounded-lg border border-gray-200 p-3 hover:bg-gray-50 transition-colors text-left"
          >
            {enquiry.spoken ? (
              <CheckSquare className="h-5 w-5 text-[#dc2626]" />
            ) : (
              <Square className="h-5 w-5 text-gray-300" />
            )}
            <div>
              <p className="text-xs text-gray-500">Spoken</p>
              <p className="text-sm font-medium">{enquiry.spoken ? "Yes" : "No"}</p>
            </div>
          </button>
        </div>

        {/* Segment */}
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wide block mb-1.5">Segment</label>
          <select
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#dc2626]/20 focus:border-[#dc2626]"
            value={enquiry.segment || "Buyer"}
            onChange={(e) => handleFieldUpdate("segment", e.target.value)}
          >
            <option value="Buyer">Buyer</option>
            <option value="Investor">Investor</option>
            <option value="Tenant">Tenant</option>
          </select>
        </div>

        {/* Lead Status */}
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wide block mb-1.5">Lead Status</label>
          <select
            className={`w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#dc2626]/20 focus:border-[#dc2626] ${statusColors[enquiry.leadStatus || "New"] || "text-gray-600"}`}
            value={enquiry.leadStatus || "New"}
            onChange={(e) => handleFieldUpdate("leadStatus", e.target.value)}
          >
            <option value="Hot">Hot</option>
            <option value="Warm">Warm</option>
            <option value="Cold">Cold</option>
            <option value="New">New</option>
          </select>
        </div>

        {/* Priority */}
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wide block mb-1.5">Priority</label>
          <select
            className={`w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#dc2626]/20 focus:border-[#dc2626] ${priorityColors[enquiry.priority || "Medium"] || "text-gray-600 bg-white"}`}
            value={enquiry.priority || "Medium"}
            onChange={(e) => handleFieldUpdate("priority", e.target.value)}
          >
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>

        {/* Next Call Date */}
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wide block mb-1.5">Next Call Date</label>
          <input
            type="date"
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#dc2626]/20 focus:border-[#dc2626]"
            value={
              enquiry.nextCallDate
                ? new Date(enquiry.nextCallDate).toISOString().split("T")[0]
                : ""
            }
            onChange={(e) => {
              const val = e.target.value ? new Date(e.target.value) : null;
              handleFieldUpdate("nextCallDate", val);
            }}
          />
        </div>

        {/* Snooze */}
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wide block mb-1.5">Snooze</label>
          <select
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#dc2626]/20 focus:border-[#dc2626]"
            value={enquiry.snooze || "Active"}
            onChange={(e) => handleFieldUpdate("snooze", e.target.value)}
          >
            <option value="Active">Active</option>
            <option value="1 Day">1 Day</option>
            <option value="3 Days">3 Days</option>
            <option value="1 Week">1 Week</option>
            <option value="2 Weeks">2 Weeks</option>
            <option value="1 Month">1 Month</option>
          </select>
        </div>

        {/* Assigned Agent */}
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wide block mb-1.5">Assigned Consultant</label>
          <select
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#dc2626]/20 focus:border-[#dc2626]"
            value={enquiry.assignedAgentId || "unassigned"}
            onChange={(e) => {
              const val = e.target.value === "unassigned" ? null : e.target.value;
              handleFieldUpdate("assignedAgentId", val);
            }}
          >
            <option value="unassigned">Unassigned</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.firstName} {agent.lastName}
              </option>
            ))}
          </select>
        </div>
      </CardContent>
    </Card>
  );
}
