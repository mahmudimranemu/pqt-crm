"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { updateDealStage, closeDealLost } from "@/lib/actions/deals";
import { LostReasonDialog } from "./lost-reason-dialog";
import { Phone, GripVertical } from "lucide-react";
import Link from "next/link";

const STAGES = [
  {
    key: "RESERVATION",
    label: "Reservation",
    color: "bg-blue-100 text-blue-700",
  },
  { key: "DEPOSIT", label: "Deposit", color: "bg-indigo-100 text-indigo-700" },
  {
    key: "CONTRACT",
    label: "Contract",
    color: "bg-purple-100 text-purple-700",
  },
  {
    key: "PAYMENT_PLAN",
    label: "Payment Plan",
    color: "bg-pink-100 text-pink-700",
  },
  {
    key: "TITLE_DEED",
    label: "Title Deed",
    color: "bg-orange-100 text-orange-700",
  },
  {
    key: "COMPLETED",
    label: "Completed",
    color: "bg-emerald-100 text-emerald-700",
  },
  { key: "CANCELLED", label: "Cancelled", color: "bg-red-100 text-red-700" },
] as const;

type DealStageKey = (typeof STAGES)[number]["key"];

interface DealCard {
  id: string;
  dealNumber: string;
  title: string;
  stage: string;
  dealValue: unknown;
  currency: string;
  probability: number | null;
  owner: { id: string; firstName: string; lastName: string } | null;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
  } | null;
}

interface DealKanbanProps {
  initialData: Record<string, DealCard[]>;
}

export function DealKanban({ initialData }: DealKanbanProps) {
  const [data, setData] = useState(initialData);
  const [draggedDeal, setDraggedDeal] = useState<{
    deal: DealCard;
    fromStage: string;
  } | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [lostReasonOpen, setLostReasonOpen] = useState(false);
  const [pendingLostDeal, setPendingLostDeal] = useState<{
    deal: DealCard;
    fromStage: string;
  } | null>(null);

  const handleDragStart = (deal: DealCard, stage: string) => {
    setDraggedDeal({ deal, fromStage: stage });
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

    if (!draggedDeal || draggedDeal.fromStage === toStage) {
      setDraggedDeal(null);
      return;
    }

    const { deal, fromStage } = draggedDeal;

    // If dropping to CANCELLED, show lost reason dialog
    if (toStage === "CANCELLED") {
      setPendingLostDeal({ deal, fromStage });
      setLostReasonOpen(true);
      setDraggedDeal(null);
      return;
    }

    // Optimistic update
    setData((prev) => {
      const updated = { ...prev };
      updated[fromStage] = (updated[fromStage] || []).filter(
        (d) => d.id !== deal.id,
      );
      updated[toStage] = [
        ...(updated[toStage] || []),
        { ...deal, stage: toStage },
      ];
      return updated;
    });

    startTransition(async () => {
      try {
        await updateDealStage(deal.id, toStage as DealStageKey);
      } catch {
        // Revert on error
        setData((prev) => {
          const reverted = { ...prev };
          reverted[toStage] = (reverted[toStage] || []).filter(
            (d) => d.id !== deal.id,
          );
          reverted[fromStage] = [...(reverted[fromStage] || []), deal];
          return reverted;
        });
      }
    });

    setDraggedDeal(null);
  };

  const handleLostReasonConfirm = async (reason: string) => {
    if (!pendingLostDeal) return;
    const { deal, fromStage } = pendingLostDeal;

    // Optimistic update
    setData((prev) => {
      const updated = { ...prev };
      updated[fromStage] = (updated[fromStage] || []).filter(
        (d) => d.id !== deal.id,
      );
      updated["CANCELLED"] = [
        ...(updated["CANCELLED"] || []),
        { ...deal, stage: "CANCELLED" },
      ];
      return updated;
    });

    setLostReasonOpen(false);
    setPendingLostDeal(null);

    startTransition(async () => {
      try {
        await closeDealLost(deal.id, reason);
      } catch {
        // Revert on error
        setData((prev) => {
          const reverted = { ...prev };
          reverted["CANCELLED"] = (reverted["CANCELLED"] || []).filter(
            (d) => d.id !== deal.id,
          );
          reverted[fromStage] = [...(reverted[fromStage] || []), deal];
          return reverted;
        });
      }
    });
  };

  // Calculate column total
  const columnTotal = (stage: string) => {
    const deals = data[stage] || [];
    return deals.reduce((sum, d) => sum + Number(d.dealValue || 0), 0);
  };

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const deals = data[stage.key] || [];
          const total = columnTotal(stage.key);

          return (
            <div
              key={stage.key}
              className={cn(
                "flex min-w-[280px] max-w-[280px] flex-col rounded-xl bg-gray-50 transition-colors",
                dragOverStage === stage.key &&
                  "bg-blue-50 ring-2 ring-blue-200",
              )}
              onDragOver={(e) => handleDragOver(e, stage.key)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage.key)}
            >
              {/* Column Header */}
              <div className="p-3 pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={cn("text-xs font-medium", stage.color)}>
                      {stage.label}
                    </Badge>
                    <span className="text-xs font-medium text-gray-400">
                      {deals.length}
                    </span>
                  </div>
                </div>
                {total > 0 && (
                  <p className="mt-1 text-xs font-medium text-gray-500">
                    ${total.toLocaleString()}
                  </p>
                )}
              </div>

              {/* Cards */}
              <div
                className="flex-1 space-y-2 overflow-y-auto px-3 pb-3"
                style={{ maxHeight: "calc(100vh - 380px)" }}
              >
                {deals.map((deal) => (
                  <Card
                    key={deal.id}
                    draggable
                    onDragStart={() => handleDragStart(deal, stage.key)}
                    className={cn(
                      "cursor-grab border border-gray-200 bg-white p-3 transition-shadow hover:shadow-md active:cursor-grabbing",
                      isPending && "opacity-70",
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-gray-300" />
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/deals/${deal.id}`}
                          className="text-sm font-medium text-gray-900 hover:text-[#dc2626] line-clamp-1"
                        >
                          {deal.title}
                        </Link>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {deal.dealNumber}
                        </p>

                        {deal.client && (
                          <div className="mt-2 flex items-center gap-1 text-xs text-gray-600">
                            <span className="truncate">
                              {deal.client.firstName} {deal.client.lastName}
                            </span>
                            {deal.client.phone && (
                              <Phone className="h-3 w-3 shrink-0 text-gray-400" />
                            )}
                          </div>
                        )}

                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-xs font-medium text-emerald-600">
                            ${Number(deal.dealValue).toLocaleString()}
                          </span>
                          <div className="flex items-center gap-1">
                            {deal.probability !== null && (
                              <span className="text-[10px] text-gray-400">
                                {deal.probability}%
                              </span>
                            )}
                            {deal.owner && (
                              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-[9px] font-medium text-gray-600">
                                {deal.owner.firstName[0]}
                                {deal.owner.lastName[0]}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}

                {deals.length === 0 && (
                  <div className="py-8 text-center text-xs text-gray-400">
                    No deals
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <LostReasonDialog
        open={lostReasonOpen}
        onClose={() => {
          setLostReasonOpen(false);
          setPendingLostDeal(null);
        }}
        onConfirm={handleLostReasonConfirm}
      />
    </>
  );
}
