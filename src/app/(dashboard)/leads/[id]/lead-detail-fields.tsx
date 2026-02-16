"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  updateLeadField,
  updateLeadStage,
  assignLeadToPool,
  removeLeadFromPool,
} from "@/lib/actions/leads";
import { Settings } from "lucide-react";

interface LeadDetailFieldsProps {
  lead: {
    id: string;
    stage: string;
    segment: string | null;
    priority: string | null;
    nextCallDate: string | null;
    snooze: string | null;
    ownerId: string;
    temperature: string | null;
    tags: string[];
  };
  agents: { id: string; firstName: string; lastName: string }[];
}

export function LeadDetailFields({ lead, agents }: LeadDetailFieldsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleChange(field: string, value: string | boolean | null) {
    startTransition(async () => {
      await updateLeadField(lead.id, field, value);
      router.refresh();
    });
  }

  function handleStageChange(stage: string) {
    startTransition(async () => {
      await updateLeadStage(lead.id, stage as any);
      router.refresh();
    });
  }

  return (
    <Card className={isPending ? "opacity-60" : ""}>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Lead Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stage */}
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wide">
            Stage
          </label>
          <select
            value={lead.stage}
            onChange={(e) => handleStageChange(e.target.value)}
            className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
          >
            <option value="NEW_ENQUIRY">New Enquiry</option>
            <option value="CONTACTED">Contacted</option>
            <option value="QUALIFIED">Qualified</option>
            <option value="VIEWING_ARRANGED">Viewing Arranged</option>
            <option value="VIEWED">Viewed</option>
            <option value="OFFER_MADE">Offer Made</option>
            <option value="NEGOTIATING">Negotiating</option>
            <option value="WON">Won</option>
            <option value="LOST">Lost</option>
          </select>
        </div>

        {/* Segment */}
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wide">
            Segment
          </label>
          <select
            value={lead.segment || "Buyer"}
            onChange={(e) => handleChange("segment", e.target.value)}
            className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
          >
            <option value="Buyer">Buyer</option>
            <option value="Investor">Investor</option>
            <option value="Renter">Renter</option>
            <option value="Citizenship">Citizenship</option>
          </select>
        </div>

        {/* Priority */}
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wide">
            Priority
          </label>
          <select
            value={lead.priority || "Medium"}
            onChange={(e) => handleChange("priority", e.target.value)}
            className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Urgent">Urgent</option>
          </select>
        </div>

        {/* Temperature */}
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wide">
            Temperature
          </label>
          <select
            value={lead.temperature || ""}
            onChange={(e) =>
              handleChange("temperature", e.target.value || null)
            }
            className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
          >
            <option value="">Not set</option>
            <option value="Cold">Cold</option>
            <option value="Warm">Warm</option>
            <option value="Hot">Hot</option>
          </select>
        </div>

        {/* Next Call Date */}
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wide">
            Next Call Date
          </label>
          <input
            type="date"
            value={
              lead.nextCallDate
                ? new Date(lead.nextCallDate).toISOString().slice(0, 10)
                : ""
            }
            onChange={(e) =>
              handleChange(
                "nextCallDate",
                e.target.value ? e.target.value : null,
              )
            }
            className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
          />
        </div>

        {/* Snooze */}
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wide">
            Snooze
          </label>
          <select
            value={lead.snooze || "Active"}
            onChange={(e) => handleChange("snooze", e.target.value)}
            className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
          >
            <option value="Active">Active</option>
            <option value="1 Week">Snooze 1 Week</option>
            <option value="2 Weeks">Snooze 2 Weeks</option>
            <option value="1 Month">Snooze 1 Month</option>
            <option value="3 Months">Snooze 3 Months</option>
          </select>
        </div>

        {/* Assigned Agent */}
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wide">
            Assigned Agent
          </label>
          <select
            value={
              lead.tags.includes("POOL_1")
                ? "POOL_1"
                : lead.tags.includes("POOL_2")
                  ? "POOL_2"
                  : lead.tags.includes("POOL_3")
                    ? "POOL_3"
                    : lead.ownerId
            }
            onChange={(e) => {
              const val = e.target.value;
              if (val === "POOL_1" || val === "POOL_2" || val === "POOL_3") {
                startTransition(async () => {
                  await assignLeadToPool(lead.id, val);
                  router.refresh();
                });
              } else {
                if (lead.tags.some((t) => t.startsWith("POOL_"))) {
                  startTransition(async () => {
                    await removeLeadFromPool(lead.id);
                    await updateLeadField(lead.id, "ownerId", val);
                    router.refresh();
                  });
                } else {
                  handleChange("ownerId", val);
                }
              }
            }}
            className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
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
        </div>
      </CardContent>
    </Card>
  );
}
