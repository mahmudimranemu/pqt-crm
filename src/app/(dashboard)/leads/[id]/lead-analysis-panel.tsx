"use client";

import { useSyncExternalStore, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { Check, ChevronDown, ChevronUp, Loader2, PenLine, RefreshCw } from "lucide-react";
import { applyAnalysisSuggestion, type LeadAnalysisState } from "@/lib/actions/lead-analysis";
import type { SuggestedUpdate } from "@/lib/ai/lead-analysis";

const HEALTH_STYLES: Record<string, string> = {
  hot: "bg-red-100 text-red-700 hover:bg-red-100",
  warm: "bg-amber-100 text-amber-700 hover:bg-amber-100",
  paused: "bg-gray-100 text-gray-600 hover:bg-gray-100",
  cold: "bg-slate-200 text-slate-700 hover:bg-slate-200",
  lost: "bg-gray-700 text-white hover:bg-gray-700",
};

const CHANNEL_LABELS: Record<string, string> = {
  call: "Call",
  whatsapp: "WhatsApp",
  email: "Email",
  meeting: "Meeting",
};

function day(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function stamp(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: "Europe/Istanbul",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function updateLabel(u: SuggestedUpdate): { what: string; from: string; to: string } {
  switch (u.field) {
    case "temperature":
      return { what: "Temperature", from: u.current || "Not set", to: u.suggested };
    case "priority":
      return { what: "Priority", from: u.current || "Not set", to: u.suggested };
    case "next_call_date":
      return {
        what: "Next call date",
        from: u.current ? day(u.current) : "Not set",
        to: day(u.suggested),
      };
    case "create_task":
      return { what: "New task", from: "", to: `${u.title} · due ${day(u.due)}` };
  }
}

/** Collapsed/expanded, remembered per user in this browser. */
function useCollapsed(key: string): [boolean, (v: boolean) => void] {
  const value = useSyncExternalStore(
    (onChange) => {
      window.addEventListener("storage", onChange);
      window.addEventListener("lead-analysis-collapse", onChange);
      return () => {
        window.removeEventListener("storage", onChange);
        window.removeEventListener("lead-analysis-collapse", onChange);
      };
    },
    () => window.localStorage.getItem(key) === "1",
    () => false,
  );
  const set = (v: boolean) => {
    window.localStorage.setItem(key, v ? "1" : "0");
    window.dispatchEvent(new Event("lead-analysis-collapse"));
  };
  return [value, set];
}

export function LeadAnalysisPanel({
  state,
  userId,
  onStateChange,
  onRerun,
  onDraft,
  rerunning,
}: {
  state: LeadAnalysisState;
  userId: string;
  onStateChange: (s: LeadAnalysisState) => void;
  onRerun: () => void;
  onDraft: (channel: string, plan: string) => void;
  rerunning: boolean;
}) {
  const [collapsed, setCollapsed] = useCollapsed(`lead-analysis-collapsed:${userId}`);
  const [applying, startApply] = useTransition();
  const a = state.analysis;
  if (!a) return null;
  const r = a.result;

  const apply = (index: number) =>
    startApply(async () => {
      const res = await applyAnalysisSuggestion(a.id, index);
      if (!res.ok) {
        toast({ variant: "destructive", title: "Couldn't apply it", description: res.error });
        return;
      }
      onStateChange(res.state);
      toast({ title: "Applied", description: "Logged in the activity log as suggested by AI Analysis." });
    });

  const plan = [
    `${r.next_action.what} (${CHANNEL_LABELS[r.next_action.channel]}, ${day(r.next_action.when)}).`,
    `Why: ${r.next_action.why}`,
    r.next_action.talking_points.length
      ? `Points to cover: ${r.next_action.talking_points.join("; ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div className="mt-4 rounded-lg border border-gray-200">
      {state.newActivity && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
          <span>New activity since this analysis.</span>
          <button
            type="button"
            onClick={onRerun}
            disabled={rerunning}
            className="font-medium underline underline-offset-2 hover:no-underline disabled:opacity-50"
          >
            Run again
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={!collapsed}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Badge className={`capitalize ${HEALTH_STYLES[r.health.label] ?? HEALTH_STYLES.paused}`}>
            {r.health.label}
          </Badge>
          <span className="text-sm font-medium text-gray-900">{r.health.headline}</span>
        </div>
        {collapsed ? (
          <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
        ) : (
          <ChevronUp className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
        )}
      </button>

      {!collapsed && (
        <div className="space-y-4 px-4 pb-4 text-sm">
          <p className="text-gray-700">{r.summary}</p>

          {/* Next action */}
          <div className="rounded-md border border-red-100 bg-red-50/60 p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#dc2626]">
              Next action · {CHANNEL_LABELS[r.next_action.channel]} · {day(r.next_action.when)}
            </div>
            <p className="mt-1 font-medium text-gray-900">{r.next_action.what}</p>
            <p className="mt-1 text-gray-600">{r.next_action.why}</p>
            {r.next_action.talking_points.length > 0 && (
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-gray-700">
                {r.next_action.talking_points.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            )}
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => onDraft(r.next_action.channel, plan)}
            >
              <PenLine className="mr-2 h-4 w-4" />
              Draft this message
            </Button>
          </div>

          {r.missing_info.length > 0 && (
            <Section title="Missing information">
              {r.missing_info.map((m) => (
                <li key={m.field}>
                  <span className="font-medium capitalize text-gray-900">
                    {m.field.replace(/_/g, " ")}
                  </span>
                  <span className="text-gray-600"> — “{m.question}”</span>
                </li>
              ))}
            </Section>
          )}

          {r.data_issues.length > 0 && (
            <Section title="Data issues">
              {r.data_issues.map((d) => (
                <li key={d.issue} className="text-gray-700">
                  {d.explanation}
                </li>
              ))}
            </Section>
          )}

          {r.suggested_updates.length > 0 && (
            <div>
              <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Suggested updates
              </h4>
              <div className="divide-y divide-gray-100 rounded-md border border-gray-200">
                {r.suggested_updates.map((u, i) => {
                  const label = updateLabel(u);
                  const done = a.applied.includes(i);
                  return (
                    <div
                      key={`${u.field}-${i}`}
                      className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="text-gray-900">
                          <span className="font-medium">{label.what}:</span>{" "}
                          {label.from && <span className="text-gray-500">{label.from} → </span>}
                          <span className="font-medium">{label.to}</span>
                        </div>
                        <div className="text-xs text-gray-500">{u.reason}</div>
                      </div>
                      {done ? (
                        <span className="inline-flex shrink-0 items-center text-xs font-medium text-emerald-700">
                          <Check className="mr-1 h-3.5 w-3.5" /> Applied
                        </span>
                      ) : (
                        state.canApply && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="shrink-0"
                            disabled={applying}
                            onClick={() => apply(i)}
                          >
                            {applying && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                            Apply
                          </Button>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {r.risks.length > 0 && (
            <Section title="Risks">
              {r.risks.map((x) => (
                <li key={x} className="text-gray-700">
                  {x}
                </li>
              ))}
            </Section>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3 text-xs text-gray-500">
            <span>
              Analysed {stamp(a.createdAt)}
              {a.requestedBy ? ` by ${a.requestedBy}` : ""} · Confidence:{" "}
              <span className="font-medium text-gray-700">{r.confidence.level}</span>
              <span className="hidden sm:inline"> — {r.confidence.reason}</span>
            </span>
            <button
              type="button"
              onClick={onRerun}
              disabled={rerunning}
              className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-800 disabled:opacity-50"
            >
              <RefreshCw className="h-3 w-3" /> Run again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</h4>
      <ul className="list-disc space-y-1 pl-5">{children}</ul>
    </div>
  );
}
