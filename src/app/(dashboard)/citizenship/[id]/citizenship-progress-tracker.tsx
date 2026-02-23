"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Check,
  Circle,
  Calendar,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  toggleMilestoneCompletion,
  updateMilestoneDate,
  reinitializeMilestones,
} from "@/lib/actions/citizenship";
import type { MilestoneStatus } from "@prisma/client";

// The canonical 12-step order
const STEP_ORDER = [
  "Client Onboarding & KYC",
  "Property Selection & Reservation",
  "Property Valuation",
  "Title Deed (TAPU) Transfer",
  "Conformity Certificate",
  "Document Collection & Preparation",
  "Residence Permit Application",
  "Citizenship Application Submission",
  "Security & Background Check",
  "Ministry Review & Approval",
  "Citizenship Granted",
  "Passport Issuance",
];

interface Milestone {
  id: string;
  milestone: string;
  status: MilestoneStatus;
  dueDate: Date | null;
  completedDate: Date | null;
  notes: string | null;
}

interface CitizenshipProgressTrackerProps {
  applicationId: string;
  milestones: Milestone[];
  isViewer?: boolean;
}

export function CitizenshipProgressTracker({
  applicationId,
  milestones,
  isViewer = false,
}: CitizenshipProgressTrackerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [editingDateId, setEditingDateId] = useState<string | null>(null);

  // Check if milestones match the new 12-step format
  const hasNewFormat = milestones.some((m) =>
    STEP_ORDER.includes(m.milestone)
  );

  // Build a map from milestone name to milestone data
  const milestoneMap = new Map<string, Milestone>();
  for (const m of milestones) {
    milestoneMap.set(m.milestone, m);
  }

  // Calculate progress
  const completedCount = milestones.filter(
    (m) => m.status === "COMPLETED"
  ).length;
  const totalSteps = hasNewFormat ? STEP_ORDER.length : milestones.length;
  const progressPercent =
    totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

  const handleToggle = async (milestoneId: string, currentlyCompleted: boolean) => {
    if (isViewer) return;
    setTogglingId(milestoneId);
    try {
      await toggleMilestoneCompletion(milestoneId, !currentlyCompleted);
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      console.error("Failed to toggle milestone:", error);
    } finally {
      setTogglingId(null);
    }
  };

  const handleDateChange = async (milestoneId: string, date: string) => {
    if (isViewer) return;
    try {
      await updateMilestoneDate(milestoneId, date);
      setEditingDateId(null);
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      console.error("Failed to update date:", error);
    }
  };

  const handleReinitialize = async () => {
    if (isViewer) return;
    try {
      await reinitializeMilestones(applicationId);
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      console.error("Failed to reinitialize milestones:", error);
    }
  };

  // If milestones are in the old format, show a reinitialize option
  if (!hasNewFormat && milestones.length > 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Citizenship Progress Tracker</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-4">
            <p className="text-muted-foreground">
              This application uses the legacy milestone format. Update to the new
              12-step citizenship tracking system to view detailed progress.
            </p>
            {!isViewer && (
              <Button
                onClick={handleReinitialize}
                className="bg-[#dc2626] hover:bg-[#b91c1c] text-white"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Upgrade to 12-Step Tracker
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Determine the steps to render
  const stepsToRender = hasNewFormat ? STEP_ORDER : [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Citizenship Progress Tracker</CardTitle>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">
              {completedCount}/{totalSteps} steps completed
            </span>
            <span className="text-sm font-bold text-[#dc2626]">
              {progressPercent}%
            </span>
          </div>
        </div>
        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
          <div
            className="bg-[#dc2626] h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {stepsToRender.map((stepName, index) => {
            const milestone = milestoneMap.get(stepName);
            if (!milestone) return null;

            const isCompleted = milestone.status === "COMPLETED";
            const isToggling = togglingId === milestone.id;
            const isEditingDate = editingDateId === milestone.id;
            const isLast = index === stepsToRender.length - 1;

            return (
              <div key={milestone.id} className="relative flex gap-4">
                {/* Vertical line connector */}
                {!isLast && (
                  <div
                    className={`absolute left-[19px] top-[40px] w-0.5 h-[calc(100%-20px)] ${
                      isCompleted ? "bg-[#dc2626]" : "bg-gray-200"
                    }`}
                  />
                )}

                {/* Checkbox circle */}
                <div className="relative z-10 flex-shrink-0">
                  <button
                    onClick={() => handleToggle(milestone.id, isCompleted)}
                    disabled={isViewer || isToggling || isPending}
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-200 ${
                      isCompleted
                        ? "bg-[#dc2626] border-[#dc2626] text-white hover:bg-[#b91c1c] hover:border-[#b91c1c]"
                        : "bg-white border-gray-300 text-gray-400 hover:border-[#dc2626] hover:text-[#dc2626]"
                    } ${isViewer ? "cursor-default" : "cursor-pointer"}`}
                    title={isCompleted ? "Mark as incomplete" : "Mark as completed"}
                  >
                    {isToggling ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isCompleted ? (
                      <Check className="h-5 w-5" strokeWidth={3} />
                    ) : (
                      <Circle className="h-5 w-5" />
                    )}
                  </button>
                </div>

                {/* Step content */}
                <div
                  className={`flex-1 pb-8 ${
                    isLast ? "pb-0" : ""
                  }`}
                >
                  <div
                    className={`flex items-start justify-between p-3 rounded-lg border transition-all duration-200 ${
                      isCompleted
                        ? "bg-red-50 border-red-200"
                        : "bg-white border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground">
                          STEP {index + 1}
                        </span>
                      </div>
                      <p
                        className={`font-medium mt-0.5 ${
                          isCompleted
                            ? "text-[#991b1b]"
                            : "text-gray-900"
                        }`}
                      >
                        {stepName}
                      </p>
                      {/* Completed date display */}
                      {isCompleted && milestone.completedDate && !isEditingDate && (
                        <button
                          onClick={() => !isViewer && setEditingDateId(milestone.id)}
                          className={`flex items-center gap-1 mt-1 text-xs text-muted-foreground ${
                            !isViewer ? "hover:text-[#dc2626] cursor-pointer" : ""
                          }`}
                        >
                          <Calendar className="h-3 w-3" />
                          Completed:{" "}
                          {new Date(milestone.completedDate).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            }
                          )}
                        </button>
                      )}
                      {/* Date editor */}
                      {isCompleted && isEditingDate && (
                        <div className="flex items-center gap-2 mt-2">
                          <input
                            type="date"
                            defaultValue={
                              milestone.completedDate
                                ? new Date(milestone.completedDate)
                                    .toISOString()
                                    .split("T")[0]
                                : new Date().toISOString().split("T")[0]
                            }
                            onChange={(e) => {
                              if (e.target.value) {
                                handleDateChange(milestone.id, e.target.value);
                              }
                            }}
                            className="text-xs border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#dc2626] focus:border-transparent"
                          />
                          <button
                            onClick={() => setEditingDateId(null)}
                            className="text-xs text-muted-foreground hover:text-gray-900"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Status indicator on the right */}
                    <div className="flex-shrink-0 ml-3">
                      {isCompleted ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-full">
                          <Check className="h-3 w-3" />
                          Done
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
