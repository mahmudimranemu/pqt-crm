"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { Plus, Loader2, Copy, Trash2, KeyRound } from "lucide-react";
import {
  createApiKey,
  deleteApiKey,
  setApiKeyActive,
} from "@/lib/actions/api-keys";

const ALL_SCOPES = [
  { id: "enquiries:read", label: "Read enquiries" },
  { id: "enquiries:write", label: "Write enquiries" },
  { id: "leads:read", label: "Read leads" },
  { id: "leads:write", label: "Write leads" },
  { id: "clients:read", label: "Read clients" },
  { id: "clients:write", label: "Write clients" },
];

type Row = {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
  createdBy: string;
};

interface Props {
  initialKeys: Row[];
}

export function ApiKeysClient({ initialKeys }: Props) {
  const [keys, setKeys] = useState(initialKeys);
  const [createOpen, setCreateOpen] = useState(false);
  const [revealOpen, setRevealOpen] = useState(false);
  const [revealedKey, setRevealedKey] = useState("");

  const onCreated = (newRow: Row, raw: string) => {
    setKeys((prev) => [newRow, ...prev]);
    setRevealedKey(raw);
    setCreateOpen(false);
    setRevealOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => setCreateOpen(true)}
          className="bg-[#dc2626] hover:bg-[#b91c1c]"
        >
          <Plus className="mr-2 h-4 w-4" />
          New API key
        </Button>
      </div>

      {keys.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-sm text-gray-500">
            No API keys yet. Create one to allow external systems to call the API.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {keys.map((k) => (
            <KeyCard
              key={k.id}
              row={k}
              onChange={(next) =>
                setKeys((rows) => rows.map((r) => (r.id === next.id ? next : r)))
              }
              onDelete={(id) =>
                setKeys((rows) => rows.filter((r) => r.id !== id))
              }
            />
          ))}
        </div>
      )}

      <CreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={onCreated}
      />

      <Dialog open={revealOpen} onOpenChange={setRevealOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>API key created</DialogTitle>
            <DialogDescription>
              Copy this key now — for security it will not be shown again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Your new API key</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={revealedKey}
                className="font-mono text-xs"
                onFocus={(e) => e.target.select()}
              />
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(revealedKey);
                  toast({ title: "Copied to clipboard" });
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Pass it as <code>Authorization: Bearer &lt;key&gt;</code> in your
              API requests.
            </p>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setRevealOpen(false)}
              className="bg-[#dc2626] hover:bg-[#b91c1c]"
            >
              I&apos;ve saved it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="border-gray-200 bg-gray-50/50">
        <CardContent className="space-y-2 p-4 text-sm text-gray-600">
          <p className="font-semibold text-gray-900">API base URL</p>
          <code className="block rounded bg-white px-2 py-1 text-xs">
            {typeof window !== "undefined" ? window.location.origin : ""}/api/v1
          </code>
          <p className="font-semibold text-gray-900 pt-2">Endpoints</p>
          <ul className="space-y-1 text-xs">
            <li><code>GET /api/v1/enquiries</code> — list (filter: status, source, page, limit)</li>
            <li><code>POST /api/v1/enquiries</code> — create</li>
            <li><code>GET /api/v1/enquiries/{"{id}"}</code> — get one</li>
            <li><code>PATCH /api/v1/enquiries/{"{id}"}</code> — update</li>
            <li><code>GET /api/v1/leads</code> — list (filter: stage, source, page, limit)</li>
            <li><code>POST /api/v1/leads</code> — create (requires <code>clientId</code>)</li>
            <li><code>GET /api/v1/leads/{"{id}"}</code> — get one</li>
            <li><code>PATCH /api/v1/leads/{"{id}"}</code> — update</li>
            <li><code>GET /api/v1/clients</code> — list (filter: status, source, email, page, limit)</li>
            <li><code>POST /api/v1/clients</code> — create</li>
            <li><code>GET /api/v1/clients/{"{id}"}</code> — get one</li>
            <li><code>PATCH /api/v1/clients/{"{id}"}</code> — update</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function KeyCard({
  row,
  onChange,
  onDelete,
}: {
  row: Row;
  onChange: (next: Row) => void;
  onDelete: (id: string) => void;
}) {
  const [pending, startTransition] = useTransition();

  const toggleActive = () => {
    startTransition(async () => {
      try {
        await setApiKeyActive(row.id, !row.isActive);
        onChange({ ...row, isActive: !row.isActive });
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Update failed",
          description: err instanceof Error ? err.message : "Unknown error",
        });
      }
    });
  };

  const handleDelete = () => {
    if (!confirm(`Delete API key "${row.name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      try {
        await deleteApiKey(row.id);
        onDelete(row.id);
        toast({ title: "API key deleted" });
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Delete failed",
          description: err instanceof Error ? err.message : "Unknown error",
        });
      }
    });
  };

  return (
    <Card className="border border-gray-200">
      <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-900">{row.name}</h3>
            {row.isActive ? (
              <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                Active
              </Badge>
            ) : (
              <Badge className="bg-gray-100 text-gray-500 hover:bg-gray-100">
                Revoked
              </Badge>
            )}
          </div>
          <p className="text-xs text-gray-500 font-mono">{row.keyPrefix}…</p>
          <div className="flex flex-wrap gap-1">
            {row.scopes.map((s) => (
              <Badge key={s} variant="outline" className="text-[10px]">
                {s}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-gray-400">
            Created by {row.createdBy} · {new Date(row.createdAt).toLocaleDateString()}
            {row.lastUsedAt && (
              <> · last used {new Date(row.lastUsedAt).toLocaleString()}</>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleActive}
            disabled={pending}
          >
            {row.isActive ? "Revoke" : "Activate"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={pending}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CreateDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (row: Row, raw: string) => void;
}) {
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  const toggleScope = (id: string) => {
    setScopes((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const submit = () => {
    if (!name.trim() || scopes.length === 0) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Provide a name and select at least one scope.",
      });
      return;
    }
    startTransition(async () => {
      try {
        const result = await createApiKey({ name: name.trim(), scopes });
        onCreated(
          {
            id: result.id,
            name: name.trim(),
            keyPrefix: result.prefix,
            scopes,
            isActive: true,
            lastUsedAt: null,
            createdAt: new Date().toISOString(),
            createdBy: "You",
          },
          result.key,
        );
        setName("");
        setScopes([]);
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Create failed",
          description: err instanceof Error ? err.message : "Unknown error",
        });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>New API key</DialogTitle>
          <DialogDescription>
            Pick a name and scopes. The key will be shown once after creation.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="key-name">Name</Label>
            <Input
              id="key-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Marketing site, Mobile app"
            />
          </div>
          <div className="grid gap-2">
            <Label>Scopes</Label>
            <div className="space-y-2">
              {ALL_SCOPES.map((s) => (
                <label
                  key={s.id}
                  className="flex items-center gap-2 text-sm text-gray-700"
                >
                  <input
                    type="checkbox"
                    checked={scopes.includes(s.id)}
                    onChange={() => toggleScope(s.id)}
                    className="h-4 w-4 rounded border-gray-300 text-[#dc2626] focus:ring-[#dc2626]"
                  />
                  {s.label}
                  <code className="ml-auto text-xs text-gray-400">{s.id}</code>
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={pending}
            className="bg-[#dc2626] hover:bg-[#b91c1c]"
          >
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create key
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
