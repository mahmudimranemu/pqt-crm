"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { Sparkles, Loader2, RefreshCw, Eye } from "lucide-react";
import { generateLeadOverview } from "@/lib/actions/client-profile";

/**
 * Shown on a lead once its client profile exists. Displays an actionable AI
 * overview ("what to do next to win this lead"), a link to the full profile,
 * and a Regenerate button that only enables when notes/call-dates changed since
 * the overview was generated.
 */
export function LeadOverviewPanel({
  leadId,
  clientId,
  overview,
  generatedAt,
  isStale,
}: {
  leadId: string;
  clientId: string;
  overview: string | null;
  generatedAt: string | null;
  isStale: boolean;
}) {
  const router = useRouter();
  const [text, setText] = useState<string | null>(overview);
  const [pending, start] = useTransition();
  const autoRan = useRef(false);

  const generate = () => {
    start(async () => {
      const res = await generateLeadOverview(leadId);
      if (!res.ok) {
        toast({ title: "Overview unavailable", description: res.error, variant: "destructive" });
        return;
      }
      setText(res.overview);
      router.refresh(); // reset the stale flag (new generatedAt > latest note)
    });
  };

  // First time the profile exists but no overview is stored yet — generate once.
  useEffect(() => {
    if (!text && !autoRan.current) {
      autoRan.current = true;
      generate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#dc2626]" />
          AI overview — next step to win this lead
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {pending && !text ? (
          <div className="flex items-center gap-2 py-4 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Reading the latest notes…
          </div>
        ) : text ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
            {text}
          </p>
        ) : (
          <p className="py-2 text-sm text-gray-500">
            No overview yet.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button asChild variant="outline" size="sm">
            <Link href={`/clients/${clientId}?tab=profile`}>
              <Eye className="mr-2 h-4 w-4" /> View profile
            </Link>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={generate}
            disabled={!isStale || pending}
            title={
              isStale
                ? "New notes/updates since the last overview — regenerate"
                : "Enabled when notes or call dates change"
            }
          >
            {pending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Regenerate overview
          </Button>

          {generatedAt && (
            <span className="text-[11px] text-gray-400">
              updated{" "}
              {new Date(generatedAt).toLocaleString("en-GB", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
              {isStale && " · new activity since"}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
