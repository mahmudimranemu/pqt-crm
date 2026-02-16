"use client";

import { useState, useTransition } from "react";
import { addCampaignStep } from "@/lib/actions/campaigns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Mail,
  Clock,
  MessageSquare,
  CheckSquare,
  GitBranch,
  Loader2,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CampaignStep {
  id: string;
  stepOrder: number;
  name: string;
  type: string;
  config: unknown;
  delayDays: number;
  createdAt: string;
}

interface StepBuilderProps {
  campaignId: string;
  initialSteps: CampaignStep[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STEP_TYPES = ["EMAIL", "WAIT", "SMS", "TASK", "CONDITION"] as const;
type StepType = (typeof STEP_TYPES)[number];

const TYPE_META: Record<
  StepType,
  { label: string; color: string; Icon: typeof Mail }
> = {
  EMAIL: {
    label: "Email",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    Icon: Mail,
  },
  WAIT: {
    label: "Wait",
    color: "bg-gray-100 text-gray-700 border-gray-200",
    Icon: Clock,
  },
  SMS: {
    label: "SMS",
    color: "bg-purple-100 text-purple-700 border-purple-200",
    Icon: MessageSquare,
  },
  TASK: {
    label: "Task",
    color: "bg-orange-100 text-orange-700 border-orange-200",
    Icon: CheckSquare,
  },
  CONDITION: {
    label: "Condition",
    color: "bg-indigo-100 text-indigo-700 border-indigo-200",
    Icon: GitBranch,
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTypeMeta(type: string) {
  return (
    TYPE_META[type as StepType] ?? {
      label: type,
      color: "bg-gray-100 text-gray-700 border-gray-200",
      Icon: Clock,
    }
  );
}

function formatConfig(config: unknown): string | null {
  if (!config || typeof config !== "object") return null;

  const entries = Object.entries(config as Record<string, unknown>).filter(
    ([, v]) => v !== null && v !== undefined && v !== "",
  );

  if (entries.length === 0) return null;

  return entries
    .slice(0, 3)
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join(" | ");
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StepBuilder({
  campaignId,
  initialSteps,
}: StepBuilderProps) {
  const [steps, setSteps] = useState<CampaignStep[]>(initialSteps);
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Form state
  const [name, setName] = useState("");
  const [type, setType] = useState<string>("EMAIL");
  const [delayDays, setDelayDays] = useState<number>(0);

  function resetForm() {
    setName("");
    setType("EMAIL");
    setDelayDays(0);
    setShowForm(false);
  }

  function handleSave() {
    if (!name.trim()) return;

    startTransition(async () => {
      try {
        const newStep = await addCampaignStep(campaignId, {
          name: name.trim(),
          type,
          delayDays,
        });

        setSteps((prev) => [
          ...prev,
          {
            id: newStep.id,
            stepOrder: newStep.stepOrder,
            name: newStep.name,
            type: newStep.type,
            config: newStep.config,
            delayDays: newStep.delayDays,
            createdAt: new Date(newStep.createdAt).toISOString(),
          },
        ]);

        resetForm();
      } catch (error) {
        console.error("Failed to add campaign step:", error);
      }
    });
  }

  return (
    <div className="space-y-1">
      {/* Step timeline */}
      {steps.length === 0 && !showForm && (
        <div className="rounded-lg border border-dashed border-gray-300 py-12 text-center">
          <Clock className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm text-gray-500">
            No steps yet. Add the first step to build your campaign sequence.
          </p>
        </div>
      )}

      {steps.map((step, index) => {
        const meta = getTypeMeta(step.type);
        const StepIcon = meta.Icon;
        const configPreview = formatConfig(step.config);
        const isLast = index === steps.length - 1 && !showForm;

        return (
          <div key={step.id} className="relative flex gap-4">
            {/* Timeline connector */}
            <div className="flex flex-col items-center">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#dc2626] text-xs font-bold text-white">
                {step.stepOrder}
              </div>
              {!isLast && (
                <div className="w-px flex-1 bg-gray-200" />
              )}
            </div>

            {/* Step card */}
            <Card className="mb-3 flex-1 border border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <StepIcon className="h-4 w-4 shrink-0 text-gray-500" />
                      <h4 className="truncate text-sm font-medium text-gray-900">
                        {step.name}
                      </h4>
                    </div>

                    {configPreview && (
                      <p className="mt-1 truncate text-xs text-gray-500">
                        {configPreview}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {step.delayDays > 0 && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        {step.delayDays}d delay
                      </span>
                    )}
                    <Badge className={meta.color}>{meta.label}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })}

      {/* Inline add-step form */}
      {showForm && (
        <div className="relative flex gap-4">
          {/* Timeline connector */}
          <div className="flex flex-col items-center">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-[#dc2626] text-xs font-bold text-[#dc2626]">
              {steps.length + 1}
            </div>
          </div>

          {/* Form card */}
          <Card className="mb-3 flex-1 border-2 border-[#dc2626]/20">
            <CardContent className="space-y-4 p-4">
              <div className="grid gap-4 sm:grid-cols-3">
                {/* Name */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="step-name"
                    className="text-xs font-medium text-gray-700"
                  >
                    Step Name
                  </label>
                  <Input
                    id="step-name"
                    placeholder="e.g. Welcome Email"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isPending}
                    autoFocus
                  />
                </div>

                {/* Type */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="step-type"
                    className="text-xs font-medium text-gray-700"
                  >
                    Type
                  </label>
                  <Select
                    value={type}
                    onValueChange={setType}
                    disabled={isPending}
                  >
                    <SelectTrigger id="step-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {STEP_TYPES.map((t) => {
                        const m = TYPE_META[t];
                        return (
                          <SelectItem key={t} value={t}>
                            <span className="flex items-center gap-2">
                              <m.Icon className="h-3.5 w-3.5" />
                              {m.label}
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Delay Days */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="step-delay"
                    className="text-xs font-medium text-gray-700"
                  >
                    Delay (days)
                  </label>
                  <Input
                    id="step-delay"
                    type="number"
                    min={0}
                    placeholder="0"
                    value={delayDays}
                    onChange={(e) =>
                      setDelayDays(Math.max(0, parseInt(e.target.value, 10) || 0))
                    }
                    disabled={isPending}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1">
                <Button
                  onClick={handleSave}
                  disabled={isPending || !name.trim()}
                  className="gap-2 bg-[#dc2626] hover:bg-[#b91c1c] text-white"
                >
                  {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isPending ? "Saving..." : "Save Step"}
                </Button>
                <Button
                  variant="outline"
                  onClick={resetForm}
                  disabled={isPending}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add step button */}
      {!showForm && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            onClick={() => setShowForm(true)}
            className="gap-2 border-dashed"
          >
            <Plus className="h-4 w-4" />
            Add Step
          </Button>
        </div>
      )}
    </div>
  );
}
