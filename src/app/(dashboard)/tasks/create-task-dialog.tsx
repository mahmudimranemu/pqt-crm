"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
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
import { Plus } from "lucide-react";
import { createTaskAction } from "@/lib/actions/tasks";
import { toast } from "@/components/ui/use-toast";

type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

const priorities: { value: Priority; label: string }[] = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

interface CreateTaskDialogProps {
  users: { id: string; firstName: string; lastName: string }[];
  leads?: { id: string; title: string }[];
  deals?: { id: string; title: string }[];
}

export function CreateTaskDialog({ users, leads, deals }: CreateTaskDialogProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "MEDIUM" as Priority,
    dueDate: "",
    assigneeId: "",
    leadId: "",
    dealId: "",
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      priority: "MEDIUM",
      dueDate: "",
      assigneeId: "",
      leadId: "",
      dealId: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Task title is required.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      await createTaskAction({
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        priority: formData.priority,
        dueDate: formData.dueDate || undefined,
        assigneeId: formData.assigneeId || undefined,
        leadId: formData.leadId || undefined,
        dealId: formData.dealId || undefined,
      });

      toast({
        title: "Task Created",
        description: "The task has been created successfully.",
      });

      setIsOpen(false);
      resetForm();
      router.refresh();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to create task.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-[#dc2626] hover:bg-[#b91c1c] text-white">
          <Plus className="h-4 w-4" />
          New Task
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="task-title">Title *</Label>
            <Input
              id="task-title"
              placeholder="Enter task title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="task-description">Description</Label>
            <Textarea
              id="task-description"
              placeholder="Enter task description (optional)"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
            />
          </div>

          {/* Priority & Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="task-priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) =>
                  setFormData({ ...formData, priority: value as Priority })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-due-date">Due Date</Label>
              <Input
                id="task-due-date"
                type="date"
                value={formData.dueDate}
                onChange={(e) =>
                  setFormData({ ...formData, dueDate: e.target.value })
                }
              />
            </div>
          </div>

          {/* Assignee */}
          <div className="space-y-2">
            <Label htmlFor="task-assignee">Assign To</Label>
            <Select
              value={formData.assigneeId}
              onValueChange={(value) =>
                setFormData({ ...formData, assigneeId: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select assignee (defaults to you)" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.firstName} {user.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Optional: Link to Lead */}
          {leads && leads.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="task-lead">Link to Lead</Label>
              <Select
                value={formData.leadId}
                onValueChange={(value) =>
                  setFormData({ ...formData, leadId: value, dealId: "" })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a lead (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {leads.map((lead) => (
                    <SelectItem key={lead.id} value={lead.id}>
                      {lead.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Optional: Link to Deal */}
          {deals && deals.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="task-deal">Link to Deal</Label>
              <Select
                value={formData.dealId}
                onValueChange={(value) =>
                  setFormData({ ...formData, dealId: value, leadId: "" })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a deal (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {deals.map((deal) => (
                    <SelectItem key={deal.id} value={deal.id}>
                      {deal.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#dc2626] hover:bg-[#b91c1c] text-white"
            >
              {isSubmitting ? "Creating..." : "Create Task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
