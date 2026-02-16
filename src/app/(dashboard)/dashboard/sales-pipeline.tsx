"use client";

import { cn } from "@/lib/utils";

interface StageData {
  stage: string;
  count: number;
  value: unknown;
}

interface SalesPipelineProps {
  stages?: StageData[];
}

const stageLabels: Record<string, string> = {
  RESERVATION: "Reservation",
  DEPOSIT: "Deposit",
  CONTRACT: "Contract",
  PAYMENT_PLAN: "Payment Plan",
  TITLE_DEED: "Title Deed",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const stageColors: Record<string, string> = {
  RESERVATION: "bg-blue-400",
  DEPOSIT: "bg-indigo-500",
  CONTRACT: "bg-purple-500",
  PAYMENT_PLAN: "bg-pink-500",
  TITLE_DEED: "bg-orange-500",
  COMPLETED: "bg-emerald-500",
  CANCELLED: "bg-red-400",
};

export function SalesPipeline({ stages = [] }: SalesPipelineProps) {
  const maxCount = Math.max(...stages.map((s) => s.count), 1);
  const totalValue = stages.reduce((sum, s) => sum + Number(s.value || 0), 0);
  const totalCount = stages.reduce((sum, s) => sum + s.count, 0);

  // Use real data if available, fallback to placeholder
  const displayStages =
    stages.length > 0
      ? stages
      : [
          { stage: "RESERVATION", count: 0, value: 0 },
          { stage: "DEPOSIT", count: 0, value: 0 },
          { stage: "CONTRACT", count: 0, value: 0 },
          { stage: "PAYMENT_PLAN", count: 0, value: 0 },
          { stage: "TITLE_DEED", count: 0, value: 0 },
          { stage: "COMPLETED", count: 0, value: 0 },
        ];

  return (
    <div className="space-y-5">
      {displayStages.map((stage) => {
        const label = stageLabels[stage.stage] || stage.stage;
        const color = stageColors[stage.stage] || "bg-gray-400";
        const width =
          maxCount > 0
            ? `${Math.max((stage.count / maxCount) * 100, 5)}%`
            : "5%";

        return (
          <div key={stage.stage} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={cn("h-2.5 w-2.5 rounded-full", color)} />
                <span className="text-sm font-medium text-gray-700">
                  {label}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="font-medium text-gray-900">{stage.count}</span>
                <span className="text-gray-500">
                  ${Number(stage.value || 0).toLocaleString()}
                </span>
              </div>
            </div>
            <div className="h-2.5 w-full rounded-full bg-gray-100">
              <div
                className={cn("h-2.5 rounded-full transition-all", color)}
                style={{ width }}
              />
            </div>
          </div>
        );
      })}

      {/* Totals */}
      <div className="mt-6 flex items-center justify-between rounded-lg bg-gray-50 p-4">
        <div>
          <p className="text-xs text-gray-500">Total Pipeline</p>
          <p className="text-xl font-bold text-gray-900">
            ${totalValue.toLocaleString()}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Total Deals</p>
          <p className="text-xl font-bold text-gray-900">{totalCount}</p>
        </div>
      </div>
    </div>
  );
}
