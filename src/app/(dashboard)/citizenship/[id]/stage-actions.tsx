"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateCitizenshipStage } from "@/lib/actions/citizenship";
import type { CitizenshipStage } from "@prisma/client";

const stageLabels: Record<CitizenshipStage, string> = {
  DOCUMENT_COLLECTION: "Document Collection",
  PROPERTY_VALUATION: "Property Valuation",
  APPLICATION_FILED: "Application Filed",
  BIOMETRICS_SCHEDULED: "Biometrics Scheduled",
  BIOMETRICS_COMPLETED: "Biometrics Completed",
  UNDER_REVIEW: "Under Review",
  INTERVIEW_SCHEDULED: "Interview Scheduled",
  INTERVIEW_COMPLETED: "Interview Completed",
  APPROVED: "Approved",
  PASSPORT_ISSUED: "Passport Issued",
  REJECTED: "Rejected",
};

const allStages: CitizenshipStage[] = [
  "DOCUMENT_COLLECTION",
  "PROPERTY_VALUATION",
  "APPLICATION_FILED",
  "BIOMETRICS_SCHEDULED",
  "BIOMETRICS_COMPLETED",
  "UNDER_REVIEW",
  "INTERVIEW_SCHEDULED",
  "INTERVIEW_COMPLETED",
  "APPROVED",
  "PASSPORT_ISSUED",
  "REJECTED",
];

interface StageActionsProps {
  applicationId: string;
  currentStage: CitizenshipStage;
}

export function StageActions({ applicationId, currentStage }: StageActionsProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedStage, setSelectedStage] = useState<CitizenshipStage>(currentStage);

  const handleStageChange = async () => {
    if (selectedStage === currentStage) return;

    try {
      setIsUpdating(true);
      await updateCitizenshipStage(applicationId, selectedStage);
      router.refresh();
    } catch (error) {
      console.error("Failed to update stage:", error);
      alert("Failed to update stage");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Select
        value={selectedStage}
        onValueChange={(value) => setSelectedStage(value as CitizenshipStage)}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {allStages.map((stage) => (
            <SelectItem key={stage} value={stage}>
              {stageLabels[stage]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        onClick={handleStageChange}
        disabled={isUpdating || selectedStage === currentStage}
        size="sm"
      >
        {isUpdating ? "Updating..." : "Update Stage"}
      </Button>
    </div>
  );
}
