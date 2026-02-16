"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, CheckCircle, Clock, Trash2 } from "lucide-react";
import { updateTaskStatus, deleteTaskAction } from "@/lib/actions/tasks";

interface TaskActionsProps {
  taskId: string;
  status: string;
}

export function TaskActions({ taskId, status }: TaskActionsProps) {
  const [isPending, startTransition] = useTransition();

  const handleStatusChange = (newStatus: "TODO" | "IN_PROGRESS" | "DONE") => {
    startTransition(async () => {
      await updateTaskStatus(taskId, newStatus);
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      await deleteTaskAction(taskId);
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isPending}>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {status !== "DONE" && (
          <DropdownMenuItem onClick={() => handleStatusChange("DONE")}>
            <CheckCircle className="mr-2 h-4 w-4 text-emerald-500" />
            Mark Done
          </DropdownMenuItem>
        )}
        {status !== "IN_PROGRESS" && status !== "DONE" && (
          <DropdownMenuItem onClick={() => handleStatusChange("IN_PROGRESS")}>
            <Clock className="mr-2 h-4 w-4 text-blue-500" />
            Start
          </DropdownMenuItem>
        )}
        {status === "DONE" && (
          <DropdownMenuItem onClick={() => handleStatusChange("TODO")}>
            <Clock className="mr-2 h-4 w-4 text-gray-500" />
            Reopen
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={handleDelete} className="text-red-600">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
