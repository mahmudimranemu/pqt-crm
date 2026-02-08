"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, XCircle } from "lucide-react";
import { updateMilestone } from "@/lib/actions/citizenship";
import type { MilestoneStatus } from "@prisma/client";

interface Milestone {
  id: string;
  milestone: string;
  status: MilestoneStatus;
  dueDate: Date | null;
  completedDate: Date | null;
  notes: string | null;
}

interface MilestoneListProps {
  milestones: Milestone[];
}

const statusIcons = {
  PENDING: Clock,
  IN_PROGRESS: Clock,
  COMPLETED: CheckCircle,
  OVERDUE: XCircle,
  SKIPPED: XCircle,
};

const statusColors: Record<
  MilestoneStatus,
  "default" | "secondary" | "success" | "warning" | "destructive"
> = {
  PENDING: "secondary",
  IN_PROGRESS: "warning",
  COMPLETED: "success",
  OVERDUE: "destructive",
  SKIPPED: "default",
};

export function MilestoneList({ milestones }: MilestoneListProps) {
  const router = useRouter();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleStatusChange = async (id: string, newStatus: MilestoneStatus) => {
    try {
      setUpdatingId(id);
      await updateMilestone(id, { status: newStatus });
      router.refresh();
    } catch (error) {
      console.error("Failed to update milestone:", error);
    } finally {
      setUpdatingId(null);
    }
  };

  if (milestones.length === 0) {
    return <p className="text-muted-foreground">No milestones defined.</p>;
  }

  return (
    <div className="space-y-3">
      {milestones.map((milestone, index) => {
        const Icon = statusIcons[milestone.status];
        const isUpdating = updatingId === milestone.id;

        return (
          <div
            key={milestone.id}
            className={`flex items-center justify-between p-3 rounded-lg border ${
              milestone.status === "COMPLETED"
                ? "bg-green-50 border-green-200"
                : ""
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-medium">
                {index + 1}
              </div>
              <div>
                <p className="font-medium">{milestone.milestone}</p>
                {milestone.completedDate && (
                  <p className="text-xs text-muted-foreground">
                    Completed:{" "}
                    {new Date(milestone.completedDate).toLocaleDateString()}
                  </p>
                )}
                {milestone.dueDate && !milestone.completedDate && (
                  <p className="text-xs text-muted-foreground">
                    Due: {new Date(milestone.dueDate).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={statusColors[milestone.status]}>
                <Icon className="h-3 w-3 mr-1" />
                {milestone.status.replace("_", " ")}
              </Badge>
              {milestone.status !== "COMPLETED" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusChange(milestone.id, "COMPLETED")}
                  disabled={isUpdating}
                >
                  {isUpdating ? "..." : "Complete"}
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
