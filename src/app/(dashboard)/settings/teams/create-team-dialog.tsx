"use client";

import { useState, useTransition } from "react";
import { createTeam } from "@/lib/actions/teams";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";

const OFFICES = [
  { value: "UAE", label: "UAE" },
  { value: "TURKEY", label: "Turkey" },
  { value: "UK", label: "UK" },
  { value: "MALAYSIA", label: "Malaysia" },
  { value: "BANGLADESH", label: "Bangladesh" },
  { value: "HEAD_OFFICE", label: "Head Office" },
] as const;

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface CreateTeamDialogProps {
  users: User[];
}

export function CreateTeamDialog({ users }: CreateTeamDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [office, setOffice] = useState("HEAD_OFFICE");
  const [managerId, setManagerId] = useState("");
  const [error, setError] = useState("");

  function resetForm() {
    setName("");
    setDescription("");
    setOffice("HEAD_OFFICE");
    setManagerId("");
    setError("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Team name is required.");
      return;
    }

    if (!managerId) {
      setError("Please select a team manager.");
      return;
    }

    startTransition(async () => {
      try {
        await createTeam({
          name: name.trim(),
          description: description.trim() || undefined,
          office: office as "UAE" | "TURKEY" | "UK" | "MALAYSIA" | "BANGLADESH" | "HEAD_OFFICE",
          managerId,
        });
        resetForm();
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create team.");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (!value) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button className="gap-2 bg-[#dc2626] hover:bg-[#b91c1c] text-white">
          <Plus className="h-4 w-4" />
          New Team
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Create New Team</DialogTitle>
          <DialogDescription>
            Set up a new team with a name, office, and manager.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 border border-red-200">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="team-name">
              Team Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="team-name"
              placeholder="e.g. Sales Team UAE"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="team-description">Description</Label>
            <Textarea
              id="team-description"
              placeholder="Optional team description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="team-office">
              Office <span className="text-red-500">*</span>
            </Label>
            <Select value={office} onValueChange={setOffice} disabled={isPending}>
              <SelectTrigger id="team-office">
                <SelectValue placeholder="Select office" />
              </SelectTrigger>
              <SelectContent>
                {OFFICES.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="team-manager">
              Manager <span className="text-red-500">*</span>
            </Label>
            <Select value={managerId} onValueChange={setManagerId} disabled={isPending}>
              <SelectTrigger id="team-manager">
                <SelectValue placeholder="Select a manager" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.firstName} {user.lastName} ({user.role.replace(/_/g, " ")})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-[#dc2626] hover:bg-[#b91c1c] text-white"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Team"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
