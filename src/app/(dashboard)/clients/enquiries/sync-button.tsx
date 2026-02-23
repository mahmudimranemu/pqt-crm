"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { syncWebsiteSubmissions } from "@/lib/actions/enquiries";

export function SyncButton() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  function handleSync() {
    setResult(null);
    startTransition(async () => {
      try {
        const res = await syncWebsiteSubmissions();
        setResult({ success: res.success, message: res.message });
        // Auto-clear message after 5 seconds
        setTimeout(() => setResult(null), 5000);
      } catch (err) {
        setResult({
          success: false,
          message: err instanceof Error ? err.message : "Sync failed",
        });
        setTimeout(() => setResult(null), 5000);
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      {result && (
        <span
          className={`text-xs ${result.success ? "text-emerald-600" : "text-red-600"}`}
        >
          {result.message}
        </span>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={handleSync}
        disabled={isPending}
        className="gap-2"
        title="Sync form submissions from the website"
      >
        <RefreshCw
          className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`}
        />
        {isPending ? "Syncing..." : "Sync Website"}
      </Button>
    </div>
  );
}
