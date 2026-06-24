"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { createTaskAction } from "@/lib/actions/tasks";
import { createCalendarNote } from "@/lib/actions/calendar";

type Option = { id: string; label: string };

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
const NONE = "__none__";

export function AddEntryDialog({
  open,
  onOpenChange,
  date,
  leads,
  enquiries,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  date: string; // YYYY-MM-DD
  leads: Option[];
  enquiries: Option[];
  onSaved: () => void;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"note" | "task">("note");
  const [submitting, setSubmitting] = useState(false);

  // Note fields
  const [noteTitle, setNoteTitle] = useState("");
  const [noteDesc, setNoteDesc] = useState("");
  const [noteLink, setNoteLink] = useState<string>(NONE); // "lead:<id>" | "enq:<id>"

  // Task fields
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskPriority, setTaskPriority] = useState<(typeof PRIORITIES)[number]>("MEDIUM");
  const [taskLead, setTaskLead] = useState<string>(NONE);

  // Reset when (re)opened on a new date
  useEffect(() => {
    if (open) {
      setTab("note");
      setNoteTitle("");
      setNoteDesc("");
      setNoteLink(NONE);
      setTaskTitle("");
      setTaskDesc("");
      setTaskPriority("MEDIUM");
      setTaskLead(NONE);
    }
  }, [open, date]);

  const prettyDate = date
    ? new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  async function saveNote() {
    if (!noteTitle.trim()) {
      toast({ variant: "destructive", title: "Title required" });
      return;
    }
    setSubmitting(true);
    try {
      const leadId = noteLink.startsWith("lead:") ? noteLink.slice(5) : undefined;
      const enquiryId = noteLink.startsWith("enq:") ? noteLink.slice(4) : undefined;
      await createCalendarNote({
        date,
        title: noteTitle.trim(),
        description: noteDesc.trim() || undefined,
        leadId,
        enquiryId,
      });
      toast({ title: "Note added" });
      onOpenChange(false);
      onSaved();
      router.refresh();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to add note",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function saveTask() {
    if (!taskTitle.trim()) {
      toast({ variant: "destructive", title: "Title required" });
      return;
    }
    setSubmitting(true);
    try {
      await createTaskAction({
        title: taskTitle.trim(),
        description: taskDesc.trim() || undefined,
        priority: taskPriority,
        dueDate: date,
        leadId: taskLead !== NONE ? taskLead : undefined,
      });
      toast({ title: "Task created" });
      onOpenChange(false);
      onSaved();
      router.refresh();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to create task",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add to {prettyDate}</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "note" | "task")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="note">Note</TabsTrigger>
            <TabsTrigger value="task">Task</TabsTrigger>
          </TabsList>

          {/* NOTE */}
          <TabsContent value="note" className="space-y-3 pt-3">
            <div className="space-y-1.5">
              <Label htmlFor="note-title">Title *</Label>
              <Input
                id="note-title"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="e.g. Call back, viewing reminder…"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="note-desc">Details</Label>
              <Textarea
                id="note-desc"
                value={noteDesc}
                onChange={(e) => setNoteDesc(e.target.value)}
                rows={3}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Link to (optional)</Label>
              <Select value={noteLink} onValueChange={setNoteLink}>
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {leads.map((l) => (
                    <SelectItem key={`lead:${l.id}`} value={`lead:${l.id}`}>
                      Lead · {l.label}
                    </SelectItem>
                  ))}
                  {enquiries.map((e) => (
                    <SelectItem key={`enq:${e.id}`} value={`enq:${e.id}`}>
                      Enquiry · {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button
                onClick={saveNote}
                disabled={submitting}
                className="bg-[#dc2626] hover:bg-[#b91c1c] text-white"
              >
                {submitting ? "Saving…" : "Add note"}
              </Button>
            </div>
          </TabsContent>

          {/* TASK */}
          <TabsContent value="task" className="space-y-3 pt-3">
            <div className="space-y-1.5">
              <Label htmlFor="task-title">Title *</Label>
              <Input
                id="task-title"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Task title"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-desc">Description</Label>
              <Textarea
                id="task-desc"
                value={taskDesc}
                onChange={(e) => setTaskDesc(e.target.value)}
                rows={3}
                placeholder="Optional"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select
                  value={taskPriority}
                  onValueChange={(v) => setTaskPriority(v as (typeof PRIORITIES)[number])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p.charAt(0) + p.slice(1).toLowerCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Due date</Label>
                <Input value={prettyDate} disabled />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Link to lead (optional)</Label>
              <Select value={taskLead} onValueChange={setTaskLead}>
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {leads.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button
                onClick={saveTask}
                disabled={submitting}
                className="bg-[#dc2626] hover:bg-[#b91c1c] text-white"
              >
                {submitting ? "Saving…" : "Create task"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
