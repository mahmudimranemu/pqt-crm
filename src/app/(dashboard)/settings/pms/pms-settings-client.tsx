"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { Loader2, Save, PlugZap, CheckCircle2 } from "lucide-react";
import {
  upsertPmsIntegration,
  testPmsConnection,
} from "@/lib/actions/pms-integration";

type Props = {
  initial: {
    baseUrl: string;
    hasKey: boolean;
    keyHint: string | null;
    isEnabled: boolean;
    lastCheckedAt: string | null;
  };
};

export function PmsSettingsClient({ initial }: Props) {
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl);
  const [apiKey, setApiKey] = useState("");
  const [enabled, setEnabled] = useState(initial.isEnabled);
  const [saving, startSave] = useTransition();
  const [testing, startTest] = useTransition();

  const save = () =>
    startSave(async () => {
      try {
        await upsertPmsIntegration({
          baseUrl,
          apiKey: apiKey.trim() || undefined,
          isEnabled: enabled,
        });
        setApiKey("");
        toast({ title: "Saved", description: "PMS connection updated." });
      } catch (e) {
        toast({
          title: "Couldn't save",
          description: e instanceof Error ? e.message : "Save failed",
          variant: "destructive",
        });
      }
    });

  const test = () =>
    startTest(async () => {
      const res = await testPmsConnection();
      if (res.ok) {
        toast({
          title: "Connection OK",
          description: `Reached the PMS — received ${res.count} sample property.`,
        });
      } else {
        toast({ title: "Connection failed", description: res.error, variant: "destructive" });
      }
    });

  return (
    <Card>
      <CardContent className="space-y-5 p-6">
        <div className="grid gap-2">
          <Label htmlFor="pms-base-url">PMS API base URL</Label>
          <Input
            id="pms-base-url"
            placeholder="https://pms.propertyquestturkey.com/api/v1"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            autoComplete="off"
          />
          <p className="text-xs text-gray-500">
            The PMS API root. Properties are read from{" "}
            <code>{"{base}"}/external/properties</code>.
          </p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="pms-api-key">
            API key {initial.hasKey && "(leave blank to keep current)"}
          </Label>
          <Input
            id="pms-api-key"
            type="password"
            placeholder={
              initial.hasKey
                ? `•••••••• ${initial.keyHint ?? "(saved)"}`
                : "Paste the PMS API key (pqt_…)"
            }
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            autoComplete="off"
          />
          <p className="text-xs text-gray-500">
            Generate this in the PMS under Settings → API, with the{" "}
            <code>property:read</code> scope. Stored encrypted.
          </p>
        </div>

        <label className="flex items-center gap-2.5">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-[#dc2626] focus:ring-[#dc2626]"
          />
          <span className="text-sm font-medium text-gray-800">
            Use PMS as the property source
          </span>
        </label>
        <p className="-mt-3 text-xs text-gray-500">
          When on, the Properties page lists PMS properties. When off, it falls
          back to the website catalog.
        </p>

        <div className="flex flex-wrap items-center gap-2 border-t pt-4">
          <Button onClick={save} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save
          </Button>
          <Button variant="outline" onClick={test} disabled={testing}>
            {testing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <PlugZap className="mr-2 h-4 w-4" />
            )}
            Test connection
          </Button>
          {initial.lastCheckedAt && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Last checked{" "}
              {new Date(initial.lastCheckedAt).toLocaleString("en-GB", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
