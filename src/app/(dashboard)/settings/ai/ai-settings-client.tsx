"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import {
  upsertAIProvider,
  upsertAITaskConfig,
} from "@/lib/actions/ai-settings";
import type { AIProviderId, AITaskType } from "@/lib/ai/generate";

type ProviderRow = {
  provider: AIProviderId;
  label: string;
  defaultModel: string;
  models: string[];
  isEnabled: boolean;
  hasKey: boolean;
  keyHint: string | null;
};

type TaskRow = {
  taskType: AITaskType;
  label: string;
  provider: string | null;
  model: string | null;
};

interface Props {
  initialData: { providers: ProviderRow[]; tasks: TaskRow[] };
}

export function AISettingsClient({ initialData }: Props) {
  const [providers, setProviders] = useState(initialData.providers);
  const [tasks, setTasks] = useState(initialData.tasks);

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Providers
        </h2>
        <div className="grid gap-3">
          {providers.map((p) => (
            <ProviderCard
              key={p.provider}
              row={p}
              onChange={(next) =>
                setProviders((rows) =>
                  rows.map((r) => (r.provider === next.provider ? next : r)),
                )
              }
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Task assignments
        </h2>
        <p className="text-sm text-gray-500">
          Choose which provider and model to use for each AI-driven task.
        </p>
        <div className="grid gap-3">
          {tasks.map((t) => (
            <TaskCard
              key={t.taskType}
              row={t}
              providers={providers}
              onChange={(next) =>
                setTasks((rows) =>
                  rows.map((r) => (r.taskType === next.taskType ? next : r)),
                )
              }
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function ProviderCard({
  row,
  onChange,
}: {
  row: ProviderRow;
  onChange: (next: ProviderRow) => void;
}) {
  const [apiKey, setApiKey] = useState("");
  const [enabled, setEnabled] = useState(row.isEnabled);
  const [pending, startTransition] = useTransition();

  const dirty = apiKey.length > 0 || enabled !== row.isEnabled;

  const onSave = () => {
    startTransition(async () => {
      try {
        await upsertAIProvider({
          provider: row.provider,
          apiKey: apiKey || undefined,
          isEnabled: enabled,
        });
        toast({ title: `${row.label} saved` });
        onChange({
          ...row,
          isEnabled: enabled,
          hasKey: row.hasKey || apiKey.length > 0,
          keyHint: apiKey
            ? `${apiKey.slice(0, 4)}…${apiKey.slice(-4)}`
            : row.keyHint,
        });
        setApiKey("");
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Save failed",
          description: err instanceof Error ? err.message : "Unknown error",
        });
      }
    });
  };

  return (
    <Card className="border border-gray-200">
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900">{row.label}</h3>
              {row.hasKey ? (
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                  Key set
                </Badge>
              ) : (
                <Badge className="bg-gray-100 text-gray-500 hover:bg-gray-100">
                  No key
                </Badge>
              )}
              {row.isEnabled && (
                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                  Enabled
                </Badge>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Default model: <code className="text-gray-700">{row.defaultModel}</code>
              {row.keyHint && (
                <span className="ml-3">
                  Current key: <code className="text-gray-700">{row.keyHint}</code>
                </span>
              )}
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-[#dc2626] focus:ring-[#dc2626]"
            />
            Enabled
          </label>
        </div>

        <div className="grid gap-2">
          <Label htmlFor={`apikey-${row.provider}`}>
            API Key {row.hasKey && "(leave blank to keep current)"}
          </Label>
          <Input
            id={`apikey-${row.provider}`}
            type="password"
            autoComplete="off"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={row.hasKey ? "•••••••• (saved)" : "Paste API key"}
          />
        </div>

        <div className="flex justify-end">
          <Button
            onClick={onSave}
            disabled={!dirty || pending}
            className="bg-[#dc2626] hover:bg-[#b91c1c]"
          >
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function TaskCard({
  row,
  providers,
  onChange,
}: {
  row: TaskRow;
  providers: ProviderRow[];
  onChange: (next: TaskRow) => void;
}) {
  const enabledProviders = providers.filter((p) => p.isEnabled && p.hasKey);
  const [providerId, setProviderId] = useState<string>(row.provider ?? "");
  const [model, setModel] = useState<string>(row.model ?? "");
  const [pending, startTransition] = useTransition();

  const dirty =
    providerId !== (row.provider ?? "") || model.trim() !== (row.model ?? "");

  const selectedProvider = providers.find((x) => x.provider === providerId);
  // Model options for the picked provider; keep any previously-saved custom
  // model that isn't in the curated list so it isn't silently dropped.
  const modelOptions = selectedProvider
    ? [
        ...selectedProvider.models,
        ...(model && !selectedProvider.models.includes(model) ? [model] : []),
      ]
    : [];

  const onProviderSelect = (id: string) => {
    setProviderId(id);
    // Switching provider always resets to that provider's default model —
    // no more copy-pasting a model name that belongs to another provider.
    const p = providers.find((x) => x.provider === id);
    setModel(p ? p.defaultModel : "");
  };

  const onSave = () => {
    if (!providerId || !model.trim()) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Pick a provider and enter a model.",
      });
      return;
    }
    startTransition(async () => {
      try {
        await upsertAITaskConfig({
          taskType: row.taskType,
          provider: providerId as AIProviderId,
          model: model.trim(),
        });
        toast({ title: `${row.label} updated` });
        onChange({ ...row, provider: providerId, model: model.trim() });
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Save failed",
          description: err instanceof Error ? err.message : "Unknown error",
        });
      }
    });
  };

  return (
    <Card className="border border-gray-200">
      <CardContent className="space-y-3 p-5">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{row.label}</h3>
          <p className="text-xs text-gray-500">
            Task ID: <code className="text-gray-700">{row.taskType}</code>
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="grid gap-2">
            <Label>Provider</Label>
            <Select value={providerId} onValueChange={onProviderSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                {enabledProviders.length === 0 && (
                  <div className="px-3 py-2 text-xs text-gray-500">
                    No providers enabled. Add a key and enable one above.
                  </div>
                )}
                {enabledProviders.map((p) => (
                  <SelectItem key={p.provider} value={p.provider}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Model</Label>
            <Select
              value={model}
              onValueChange={setModel}
              disabled={!providerId}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    providerId ? "Select model" : "Select a provider first"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {modelOptions.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                    {selectedProvider?.defaultModel === m ? " (default)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={onSave}
            disabled={!dirty || pending}
            className="bg-[#dc2626] hover:bg-[#b91c1c]"
          >
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
