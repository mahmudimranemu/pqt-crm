"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import {
  Plus,
  Trash2,
  Power,
  PowerOff,
  Users,
  ChevronDown,
  ChevronUp,
  Pencil,
  Check,
  X,
  AlertTriangle,
  ArrowRightLeft,
} from "lucide-react";
import {
  createPool,
  deletePool,
  togglePoolActive,
  updatePoolName,
  setPoolAccess,
  getPoolItemCount,
  transferPoolItems,
} from "@/lib/actions/crm-settings";

type Pool = {
  id: string;
  name: string;
  tag: string;
  isActive: boolean;
  allowedUserIds: string[];
  createdAt: Date;
};

type User = {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
};

interface PoolManagerProps {
  initialPools: Pool[];
  users: User[];
}

const POOL_COLORS = [
  "bg-blue-500",
  "bg-purple-500",
  "bg-orange-500",
  "bg-green-500",
  "bg-pink-500",
  "bg-teal-500",
  "bg-yellow-500",
  "bg-indigo-500",
];

function getPoolColor(index: number) {
  return POOL_COLORS[index % POOL_COLORS.length];
}

export function PoolManager({ initialPools, users }: PoolManagerProps) {
  const router = useRouter();
  const [pools, setPools] = useState<Pool[]>(initialPools);
  const [isPending, startTransition] = useTransition();

  // New pool form
  const [newPoolName, setNewPoolName] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);

  // Inline rename state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  // Access control expanded state
  const [expandedAccess, setExpandedAccess] = useState<string | null>(null);

  // Transfer dialog state
  const [transferDialog, setTransferDialog] = useState<{
    pool: Pool;
    action: "delete" | "deactivate";
    enquiryCount: number;
    leadCount: number;
  } | null>(null);
  const [transferType, setTransferType] = useState<"pool" | "user">("pool");
  const [transferTarget, setTransferTarget] = useState("");

  async function handleCreate() {
    if (!newPoolName.trim()) return;
    startTransition(async () => {
      try {
        const pool = await createPool(newPoolName);
        setPools((prev) => [...prev, pool as Pool]);
        setNewPoolName("");
        setShowNewForm(false);
        toast({ title: "Pool created", description: `"${pool.name}" is ready to use.` });
        router.refresh();
      } catch (e) {
        toast({ variant: "destructive", title: "Error", description: (e as Error).message });
      }
    });
  }

  async function handleToggle(pool: Pool) {
    // If activating (currently inactive), just activate directly
    if (!pool.isActive) {
      startTransition(async () => {
        try {
          await togglePoolActive(pool.id);
          setPools((prev) =>
            prev.map((p) => (p.id === pool.id ? { ...p, isActive: true } : p)),
          );
          toast({ title: "Pool activated", description: `"${pool.name}" has been activated.` });
          router.refresh();
        } catch (e) {
          toast({ variant: "destructive", title: "Error", description: (e as Error).message });
        }
      });
      return;
    }

    // Deactivating: check for assigned items first
    startTransition(async () => {
      try {
        const counts = await getPoolItemCount(pool.id);
        if (counts.total > 0) {
          setTransferDialog({
            pool,
            action: "deactivate",
            enquiryCount: counts.enquiryCount,
            leadCount: counts.leadCount,
          });
          setTransferType("pool");
          setTransferTarget("");
        } else {
          await togglePoolActive(pool.id);
          setPools((prev) =>
            prev.map((p) => (p.id === pool.id ? { ...p, isActive: false } : p)),
          );
          toast({ title: "Pool deactivated", description: `"${pool.name}" has been deactivated.` });
          router.refresh();
        }
      } catch (e) {
        toast({ variant: "destructive", title: "Error", description: (e as Error).message });
      }
    });
  }

  async function handleDelete(pool: Pool) {
    startTransition(async () => {
      try {
        const counts = await getPoolItemCount(pool.id);
        if (counts.total > 0) {
          setTransferDialog({
            pool,
            action: "delete",
            enquiryCount: counts.enquiryCount,
            leadCount: counts.leadCount,
          });
          setTransferType("pool");
          setTransferTarget("");
        } else {
          if (!window.confirm(`Delete "${pool.name}"?`)) return;
          await deletePool(pool.id);
          setPools((prev) => prev.filter((p) => p.id !== pool.id));
          toast({ title: "Pool deleted", description: `"${pool.name}" has been removed.` });
          router.refresh();
        }
      } catch (e) {
        toast({ variant: "destructive", title: "Error", description: (e as Error).message });
      }
    });
  }

  async function handleTransferAndAction() {
    if (!transferDialog || !transferTarget) return;
    const { pool, action } = transferDialog;

    startTransition(async () => {
      try {
        // Transfer items first
        await transferPoolItems(
          pool.id,
          transferType === "pool"
            ? { type: "pool", poolId: transferTarget }
            : { type: "user", userId: transferTarget },
        );

        // Then perform the action
        if (action === "delete") {
          await deletePool(pool.id);
          setPools((prev) => prev.filter((p) => p.id !== pool.id));
          toast({ title: "Pool deleted", description: `Items transferred and "${pool.name}" deleted.` });
        } else {
          await togglePoolActive(pool.id);
          setPools((prev) =>
            prev.map((p) => (p.id === pool.id ? { ...p, isActive: false } : p)),
          );
          toast({ title: "Pool deactivated", description: `Items transferred and "${pool.name}" deactivated.` });
        }

        setTransferDialog(null);
        router.refresh();
      } catch (e) {
        toast({ variant: "destructive", title: "Error", description: (e as Error).message });
      }
    });
  }

  async function handleRename(pool: Pool) {
    if (!editName.trim() || editName === pool.name) {
      setEditingId(null);
      return;
    }
    startTransition(async () => {
      try {
        await updatePoolName(pool.id, editName);
        setPools((prev) =>
          prev.map((p) => (p.id === pool.id ? { ...p, name: editName.trim() } : p)),
        );
        setEditingId(null);
        toast({ title: "Pool renamed" });
        router.refresh();
      } catch (e) {
        toast({ variant: "destructive", title: "Error", description: (e as Error).message });
      }
    });
  }

  async function handleAccessChange(pool: Pool, userId: string, allowed: boolean) {
    const newIds = allowed
      ? [...pool.allowedUserIds, userId]
      : pool.allowedUserIds.filter((id) => id !== userId);

    startTransition(async () => {
      try {
        await setPoolAccess(pool.id, newIds);
        setPools((prev) =>
          prev.map((p) => (p.id === pool.id ? { ...p, allowedUserIds: newIds } : p)),
        );
        router.refresh();
      } catch (e) {
        toast({ variant: "destructive", title: "Error", description: (e as Error).message });
      }
    });
  }

  async function handleSetAllUsers(pool: Pool) {
    startTransition(async () => {
      try {
        await setPoolAccess(pool.id, []);
        setPools((prev) =>
          prev.map((p) => (p.id === pool.id ? { ...p, allowedUserIds: [] } : p)),
        );
        router.refresh();
      } catch (e) {
        toast({ variant: "destructive", title: "Error", description: (e as Error).message });
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Pool Section Header */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-lg">Reallocation Pools</CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Pools appear in the consultant assignment dropdown. Control who can
              assign enquiries and leads to each pool.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setShowNewForm(true)}
            disabled={isPending || showNewForm}
            className="bg-[#dc2626] hover:bg-[#b91c1c] text-white shrink-0"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            New Pool
          </Button>
        </CardHeader>

        {/* Create new pool form */}
        {showNewForm && (
          <CardContent className="pt-0">
            <div className="flex gap-2 items-center rounded-lg border border-[#dc2626]/30 bg-red-50 p-3">
              <input
                autoFocus
                type="text"
                placeholder="Pool name (e.g. Pool 4)"
                value={newPoolName}
                onChange={(e) => setNewPoolName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                  if (e.key === "Escape") {
                    setShowNewForm(false);
                    setNewPoolName("");
                  }
                }}
                className="flex-1 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-[#dc2626]"
              />
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={isPending || !newPoolName.trim()}
                className="bg-[#dc2626] hover:bg-[#b91c1c] text-white"
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowNewForm(false);
                  setNewPoolName("");
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        )}

        <CardContent className={showNewForm ? "pt-3" : "pt-0"}>
          {pools.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">
              No pools yet. Create one above.
            </div>
          ) : (
            <div className="space-y-3">
              {pools.map((pool, index) => {
                const isExpanded = expandedAccess === pool.id;
                const isAllUsers = pool.allowedUserIds.length === 0;
                const allowedCount = pool.allowedUserIds.length;

                return (
                  <div
                    key={pool.id}
                    className={`rounded-xl border ${pool.isActive ? "border-gray-200 bg-white" : "border-gray-100 bg-gray-50"} overflow-hidden`}
                  >
                    {/* Pool Row */}
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div
                        className={`h-3 w-3 shrink-0 rounded-full ${getPoolColor(index)} ${!pool.isActive ? "opacity-40" : ""}`}
                      />

                      {/* Name / edit inline */}
                      {editingId === pool.id ? (
                        <div className="flex flex-1 items-center gap-2">
                          <input
                            autoFocus
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleRename(pool);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                            className="flex-1 rounded border border-gray-300 px-2 py-0.5 text-sm outline-none focus:border-[#dc2626]"
                          />
                          <button
                            onClick={() => handleRename(pool)}
                            className="text-green-600 hover:text-green-700"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-1 items-center gap-2 min-w-0">
                          <span
                            className={`text-sm font-medium ${pool.isActive ? "text-gray-900" : "text-gray-400"}`}
                          >
                            {pool.name}
                          </span>
                          <code className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-mono">
                            {pool.tag}
                          </code>
                          {!pool.isActive && (
                            <Badge variant="secondary" className="text-xs text-gray-400">
                              Inactive
                            </Badge>
                          )}
                          <button
                            onClick={() => {
                              setEditingId(pool.id);
                              setEditName(pool.name);
                            }}
                            className="ml-1 text-gray-300 hover:text-gray-500 transition-colors"
                            title="Rename"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Access badge + toggle */}
                      <button
                        onClick={() =>
                          setExpandedAccess(isExpanded ? null : pool.id)
                        }
                        className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
                      >
                        <Users className="h-3.5 w-3.5" />
                        {isAllUsers ? "All users" : `${allowedCount} user${allowedCount !== 1 ? "s" : ""}`}
                        {isExpanded ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )}
                      </button>

                      {/* Actions */}
                      <button
                        onClick={() => handleToggle(pool)}
                        disabled={isPending}
                        title={pool.isActive ? "Deactivate" : "Activate"}
                        className={`shrink-0 rounded-md p-1.5 transition-colors ${
                          pool.isActive
                            ? "text-green-600 hover:bg-green-50"
                            : "text-gray-400 hover:bg-gray-100"
                        }`}
                      >
                        {pool.isActive ? (
                          <Power className="h-4 w-4" />
                        ) : (
                          <PowerOff className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(pool)}
                        disabled={isPending}
                        title="Delete pool"
                        className="shrink-0 rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Access control panel */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 bg-gray-50 px-4 py-4">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-medium text-gray-700">
                            Who can assign to this pool?
                          </p>
                          {!isAllUsers && (
                            <button
                              onClick={() => handleSetAllUsers(pool)}
                              className="text-xs text-[#dc2626] hover:underline"
                            >
                              Allow all users
                            </button>
                          )}
                        </div>
                        {isAllUsers && (
                          <p className="text-xs text-gray-500 mb-3">
                            Currently all active users can assign to this pool. Select specific users below to restrict access.
                          </p>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                          {users.map((user) => {
                            const checked =
                              isAllUsers ||
                              pool.allowedUserIds.includes(user.id);
                            return (
                              <label
                                key={user.id}
                                className="flex items-center gap-2.5 rounded-lg border border-gray-200 bg-white px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={
                                    isAllUsers
                                      ? true
                                      : pool.allowedUserIds.includes(user.id)
                                  }
                                  onChange={(e) => {
                                    if (isAllUsers) {
                                      // First click when "all users": restrict to this specific user
                                      startTransition(async () => {
                                        const allIds = users.map((u) => u.id);
                                        const newIds = e.target.checked
                                          ? allIds
                                          : allIds.filter((id) => id !== user.id);
                                        await setPoolAccess(pool.id, newIds.length === users.length ? [] : newIds);
                                        setPools((prev) =>
                                          prev.map((p) =>
                                            p.id === pool.id
                                              ? { ...p, allowedUserIds: newIds.length === users.length ? [] : newIds }
                                              : p,
                                          ),
                                        );
                                        router.refresh();
                                      });
                                    } else {
                                      handleAccessChange(pool, user.id, e.target.checked);
                                    }
                                  }}
                                  className="accent-[#dc2626]"
                                  disabled={isPending}
                                />
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {user.firstName} {user.lastName}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {user.role.replace(/_/g, " ")}
                                  </p>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                        {!isAllUsers && pool.allowedUserIds.length > 0 && (
                          <p className="text-xs text-gray-400 mt-2">
                            Only the selected users (and Super Admins) can assign to this pool.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transfer Dialog */}
      <Dialog
        open={!!transferDialog}
        onOpenChange={(open) => !open && setTransferDialog(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {transferDialog?.action === "delete" ? "Delete" : "Deactivate"} &ldquo;{transferDialog?.pool.name}&rdquo;
            </DialogTitle>
            <DialogDescription>
              This pool has{" "}
              {transferDialog && (
                <span className="font-medium text-gray-900">
                  {transferDialog.enquiryCount > 0 && `${transferDialog.enquiryCount} enquir${transferDialog.enquiryCount === 1 ? "y" : "ies"}`}
                  {transferDialog.enquiryCount > 0 && transferDialog.leadCount > 0 && " and "}
                  {transferDialog.leadCount > 0 && `${transferDialog.leadCount} lead${transferDialog.leadCount === 1 ? "" : "s"}`}
                </span>
              )}{" "}
              assigned. Transfer them before proceeding.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Transfer type toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => { setTransferType("pool"); setTransferTarget(""); }}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  transferType === "pool"
                    ? "border-[#dc2626] bg-red-50 text-[#dc2626]"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <ArrowRightLeft className="inline h-4 w-4 mr-1.5" />
                To another pool
              </button>
              <button
                onClick={() => { setTransferType("user"); setTransferTarget(""); }}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  transferType === "user"
                    ? "border-[#dc2626] bg-red-50 text-[#dc2626]"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Users className="inline h-4 w-4 mr-1.5" />
                To a user
              </button>
            </div>

            {/* Target selector */}
            <Select value={transferTarget} onValueChange={setTransferTarget}>
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    transferType === "pool"
                      ? "Select target pool..."
                      : "Select target user..."
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {transferType === "pool"
                  ? pools
                      .filter((p) => p.id !== transferDialog?.pool.id && p.isActive)
                      .map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))
                  : users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.firstName} {u.lastName}
                      </SelectItem>
                    ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setTransferDialog(null)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleTransferAndAction}
              disabled={isPending || !transferTarget}
              className="bg-[#dc2626] hover:bg-[#b91c1c] text-white"
            >
              {isPending ? "Transferring..." : `Transfer & ${transferDialog?.action === "delete" ? "Delete" : "Deactivate"}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
