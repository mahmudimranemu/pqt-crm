"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { updateSaleStatus } from "@/lib/actions/sales";
import type { SaleStatus } from "@prisma/client";

interface SaleStatusActionsProps {
  saleId: string;
  currentStatus: SaleStatus;
}

const nextStatus: Record<SaleStatus, SaleStatus | null> = {
  PENDING_DEPOSIT: "DEPOSIT_RECEIVED",
  DEPOSIT_RECEIVED: "CONTRACT_SIGNED",
  CONTRACT_SIGNED: "TITLE_DEED_TRANSFER",
  TITLE_DEED_TRANSFER: "COMPLETED",
  COMPLETED: null,
  CANCELLED: null,
};

const statusLabels: Record<SaleStatus, string> = {
  PENDING_DEPOSIT: "Pending Deposit",
  DEPOSIT_RECEIVED: "Deposit Received",
  CONTRACT_SIGNED: "Contract Signed",
  TITLE_DEED_TRANSFER: "Title Deed Transfer",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export function SaleStatusActions({ saleId, currentStatus }: SaleStatusActionsProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);

  const next = nextStatus[currentStatus];

  const handleAdvanceStatus = async () => {
    if (!next) return;

    try {
      setIsUpdating(true);
      await updateSaleStatus(saleId, next);
      router.refresh();
    } catch (error) {
      console.error("Failed to update status:", error);
      alert("Failed to update status. You may not have permission.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this sale?")) return;

    try {
      setIsUpdating(true);
      await updateSaleStatus(saleId, "CANCELLED");
      router.refresh();
    } catch (error) {
      console.error("Failed to cancel sale:", error);
      alert("Failed to cancel sale. You may not have permission.");
    } finally {
      setIsUpdating(false);
    }
  };

  if (currentStatus === "COMPLETED" || currentStatus === "CANCELLED") {
    return null;
  }

  return (
    <div className="flex gap-4">
      {next && (
        <Button
          onClick={handleAdvanceStatus}
          disabled={isUpdating}
          className="bg-[#dc2626] hover:bg-[#dc2626]/90"
        >
          {isUpdating ? "Updating..." : `Advance to ${statusLabels[next]}`}
        </Button>
      )}
      <Button
        variant="destructive"
        onClick={handleCancel}
        disabled={isUpdating}
      >
        Cancel Sale
      </Button>
    </div>
  );
}
