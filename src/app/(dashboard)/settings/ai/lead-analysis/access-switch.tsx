"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { setAnalysisAccess } from "@/lib/actions/lead-analysis";
import type { AnalysisAccess } from "@/lib/ai/lead-analysis-config";

const OPTIONS: { value: AnalysisAccess; label: string; hint: string }[] = [
  { value: "off", label: "Off", hint: "The Analysis button is hidden for everyone." },
  {
    value: "admins",
    label: "Super Admins only",
    hint: "For checking the advice before the team uses it.",
  },
  { value: "all", label: "Everyone", hint: "Anyone who can open a lead can analyse it." },
];

export function AnalysisAccessSwitch({ initial }: { initial: AnalysisAccess }) {
  const [value, setValue] = useState(initial);
  const [pending, start] = useTransition();

  const choose = (next: AnalysisAccess) =>
    start(async () => {
      try {
        await setAnalysisAccess(next);
        setValue(next);
        toast({ title: `Lead Analysis: ${OPTIONS.find((o) => o.value === next)?.label}` });
      } catch (e) {
        toast({
          variant: "destructive",
          title: "Couldn't change it",
          description: e instanceof Error ? e.message : "Unknown error",
        });
      }
    });

  return (
    <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Who can use Lead Analysis">
      {OPTIONS.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={pending}
            onClick={() => !active && choose(o.value)}
            className={`rounded-lg border p-3 text-left transition-colors ${
              active ? "border-[#dc2626] bg-red-50" : "border-gray-200 hover:bg-gray-50"
            }`}
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              {pending && active && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {o.label}
            </div>
            <div className="mt-0.5 text-xs text-gray-500">{o.hint}</div>
          </button>
        );
      })}
    </div>
  );
}
