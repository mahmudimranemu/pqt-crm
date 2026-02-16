"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const COMMON_REASONS = [
  "Budget too low",
  "Chose competitor",
  "No longer interested",
  "Unresponsive",
  "Location mismatch",
  "Timeline mismatch",
  "Not qualified",
  "Other",
];

interface LostReasonDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  entityType?: string;
}

export function LostReasonDialog({
  open,
  onClose,
  onConfirm,
  entityType = "Lead",
}: LostReasonDialogProps) {
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [details, setDetails] = useState("");

  const handleConfirm = () => {
    const reason = details.trim()
      ? `${selectedReason}${selectedReason ? ": " : ""}${details.trim()}`
      : selectedReason;
    if (!reason) return;
    onConfirm(reason);
    setSelectedReason("");
    setDetails("");
  };

  const handleClose = () => {
    setSelectedReason("");
    setDetails("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Mark {entityType} as Lost</DialogTitle>
          <DialogDescription>
            Please select a reason for marking this {entityType.toLowerCase()} as
            lost. This helps improve our pipeline insights.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Quick reason pills */}
          <div className="flex flex-wrap gap-2">
            {COMMON_REASONS.map((reason) => (
              <button
                key={reason}
                onClick={() => setSelectedReason(reason)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  selectedReason === reason
                    ? "border-[#dc2626] bg-[#dc2626] text-white"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
                )}
              >
                {reason}
              </button>
            ))}
          </div>

          {/* Details textarea */}
          <Textarea
            placeholder="Add more details (optional)..."
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={3}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedReason && !details.trim()}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Mark as Lost
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
