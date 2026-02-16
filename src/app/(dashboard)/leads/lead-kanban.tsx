"use client";

import { useState, useTransition } from "react";
import type { Decimal } from "@prisma/client/runtime/library";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { updateLeadStage, updateLeadField } from "@/lib/actions/leads";
import { Phone, GripVertical } from "lucide-react";
import Link from "next/link";
import { LostReasonDialog } from "./lost-reason-dialog";

const STAGES = [
  {
    key: "NEW_ENQUIRY",
    label: "New Enquiry",
    color: "bg-gray-100 text-gray-700",
  },
  { key: "CONTACTED", label: "Contacted", color: "bg-blue-100 text-blue-700" },
  {
    key: "QUALIFIED",
    label: "Qualified",
    color: "bg-indigo-100 text-indigo-700",
  },
  {
    key: "VIEWING_ARRANGED",
    label: "Viewing",
    color: "bg-purple-100 text-purple-700",
  },
  { key: "VIEWED", label: "Viewed", color: "bg-pink-100 text-pink-700" },
  {
    key: "OFFER_MADE",
    label: "Offer Made",
    color: "bg-orange-100 text-orange-700",
  },
  {
    key: "NEGOTIATING",
    label: "Negotiating",
    color: "bg-yellow-100 text-yellow-700",
  },
  { key: "WON", label: "Won", color: "bg-emerald-100 text-emerald-700" },
  { key: "LOST", label: "Lost", color: "bg-red-100 text-red-700" },
] as const;

type LeadStageKey = (typeof STAGES)[number]["key"];

interface LeadCard {
  id: string;
  leadNumber: string;
  title: string;
  stage: string;
  estimatedValue: Decimal | number | string | null;
  currency: string;
  owner: { id: string; firstName: string; lastName: string } | null;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
  } | null;
}

interface LeadKanbanProps {
  initialData: Record<string, LeadCard[]>;
}

export function LeadKanban({ initialData }: LeadKanbanProps) {
  const [data, setData] = useState(initialData);
  const [draggedLead, setDraggedLead] = useState<{
    lead: LeadCard;
    fromStage: string;
  } | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [lostReasonOpen, setLostReasonOpen] = useState(false);
  const [pendingLostLead, setPendingLostLead] = useState<{
    lead: LeadCard;
    fromStage: string;
  } | null>(null);

  const handleDragStart = (lead: LeadCard, stage: string) => {
    setDraggedLead({ lead, fromStage: stage });
  };

  const handleDragOver = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    setDragOverStage(stage);
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = (e: React.DragEvent, toStage: string) => {
    e.preventDefault();
    setDragOverStage(null);

    if (!draggedLead || draggedLead.fromStage === toStage) {
      setDraggedLead(null);
      return;
    }

    const { lead, fromStage } = draggedLead;

    // Intercept LOST stage — require a reason
    if (toStage === "LOST") {
      setPendingLostLead({ lead, fromStage });
      setLostReasonOpen(true);
      setDraggedLead(null);
      return;
    }

    moveLeadToStage(lead, fromStage, toStage);
    setDraggedLead(null);
  };

  const moveLeadToStage = (
    lead: LeadCard,
    fromStage: string,
    toStage: string,
  ) => {
    // Optimistic update
    setData((prev) => {
      const updated = { ...prev };
      updated[fromStage] = (updated[fromStage] || []).filter(
        (l) => l.id !== lead.id,
      );
      updated[toStage] = [
        ...(updated[toStage] || []),
        { ...lead, stage: toStage },
      ];
      return updated;
    });

    startTransition(async () => {
      try {
        await updateLeadStage(lead.id, toStage as LeadStageKey);
      } catch {
        // Revert on error
        setData((prev) => {
          const reverted = { ...prev };
          reverted[toStage] = (reverted[toStage] || []).filter(
            (l) => l.id !== lead.id,
          );
          reverted[fromStage] = [...(reverted[fromStage] || []), lead];
          return reverted;
        });
      }
    });
  };

  const handleLostReasonConfirm = (reason: string) => {
    if (!pendingLostLead) return;
    const { lead, fromStage } = pendingLostLead;

    moveLeadToStage(lead, fromStage, "LOST");

    // Save the lost reason
    startTransition(async () => {
      try {
        await updateLeadField(lead.id, "lostReason", reason);
      } catch {
        // Non-critical — stage already updated
      }
    });

    setLostReasonOpen(false);
    setPendingLostLead(null);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {STAGES.map((stage) => {
        const leads = data[stage.key] || [];

        return (
          <div
            key={stage.key}
            className={cn(
              "flex min-w-[280px] max-w-[280px] flex-col rounded-xl bg-gray-50 transition-colors",
              dragOverStage === stage.key && "bg-blue-50 ring-2 ring-blue-200",
            )}
            onDragOver={(e) => handleDragOver(e, stage.key)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, stage.key)}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between p-3 pb-2">
              <div className="flex items-center gap-2">
                <Badge className={cn("text-xs font-medium", stage.color)}>
                  {stage.label}
                </Badge>
                <span className="text-xs font-medium text-gray-400">
                  {leads.length}
                </span>
              </div>
            </div>

            {/* Cards */}
            <div
              className="flex-1 space-y-2 overflow-y-auto px-3 pb-3"
              style={{ maxHeight: "calc(100vh - 340px)" }}
            >
              {leads.map((lead) => (
                <Card
                  key={lead.id}
                  draggable
                  onDragStart={() => handleDragStart(lead, stage.key)}
                  className={cn(
                    "cursor-grab border border-gray-200 bg-white p-3 transition-shadow hover:shadow-md active:cursor-grabbing",
                    isPending && "opacity-70",
                  )}
                >
                  <div className="flex items-start gap-2">
                    <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-gray-300" />
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/leads/${lead.id}`}
                        className="text-sm font-medium text-gray-900 hover:text-[#dc2626] line-clamp-1"
                      >
                        {lead.title}
                      </Link>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {lead.leadNumber}
                      </p>

                      {lead.client && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-gray-600">
                          <span className="truncate">
                            {lead.client.firstName} {lead.client.lastName}
                          </span>
                          {lead.client.phone && (
                            <Phone className="h-3 w-3 shrink-0 text-gray-400" />
                          )}
                        </div>
                      )}

                      <div className="mt-2 flex items-center justify-between">
                        {lead.estimatedValue && (
                          <span className="text-xs font-medium text-emerald-600">
                            ${Number(lead.estimatedValue).toLocaleString()}
                          </span>
                        )}
                        {lead.owner && (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-[9px] font-medium text-gray-600">
                            {lead.owner.firstName[0]}
                            {lead.owner.lastName[0]}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}

              {leads.length === 0 && (
                <div className="py-8 text-center text-xs text-gray-400">
                  No leads
                </div>
              )}
            </div>
          </div>
        );
      })}

      <LostReasonDialog
        open={lostReasonOpen}
        onClose={() => {
          setLostReasonOpen(false);
          setPendingLostLead(null);
        }}
        onConfirm={handleLostReasonConfirm}
        entityType="Lead"
      />
    </div>
  );
}
