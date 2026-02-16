import { auth, type ExtendedSession } from "@/lib/auth";
import { getTasks, getOverdueTasksCount } from "@/lib/actions/tasks";
import { getUsers } from "@/lib/actions/users";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CheckSquare,
  Plus,
  AlertTriangle,
  Clock,
  CheckCircle,
  Circle,
} from "lucide-react";
import Link from "next/link";
import { TaskActions } from "./task-actions";

const priorityColors: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-700",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
};

const statusIcons: Record<string, React.ElementType> = {
  TODO: Circle,
  IN_PROGRESS: Clock,
  DONE: CheckCircle,
  CANCELLED: AlertTriangle,
};

export default async function TasksPage() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) return null;

  const [{ tasks, total }, overdueCount] = await Promise.all([
    getTasks({ limit: 50 }),
    getOverdueTasksCount(),
  ]);

  const todoCount = tasks.filter((t) => t.status === "TODO").length;
  const inProgressCount = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const doneCount = tasks.filter((t) => t.status === "DONE").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
            <CheckSquare className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
            <p className="text-gray-500">Manage your tasks and to-dos</p>
          </div>
        </div>
        <Button className="gap-2 bg-[#dc2626] hover:bg-[#b91c1c] text-white">
          <Plus className="h-4 w-4" />
          New Task
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">To Do</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{todoCount}</p>
              </div>
              <Circle className="h-5 w-5 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="border border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">In Progress</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{inProgressCount}</p>
              </div>
              <Clock className="h-5 w-5 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Completed</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{doneCount}</p>
              </div>
              <CheckCircle className="h-5 w-5 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Overdue</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{overdueCount}</p>
              </div>
              <AlertTriangle className={`h-5 w-5 ${overdueCount > 0 ? "text-red-500" : "text-gray-400"}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tasks Table */}
      <Card className="border border-gray-200">
        <CardContent className="p-0">
          {tasks.length === 0 ? (
            <div className="py-12 text-center">
              <CheckSquare className="mx-auto mb-4 h-12 w-12 text-gray-300" />
              <p className="text-gray-500">No tasks yet. Create one to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-gray-100 bg-gray-50/50">
                  <TableHead className="text-xs font-medium text-gray-500">Status</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">Task</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">Priority</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">Assigned To</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">Related To</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">Due Date</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => {
                  const StatusIcon = statusIcons[task.status] || Circle;
                  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "DONE";

                  return (
                    <TableRow key={task.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <TableCell>
                        <StatusIcon className={`h-4 w-4 ${
                          task.status === "DONE" ? "text-emerald-500" :
                          task.status === "IN_PROGRESS" ? "text-blue-500" :
                          "text-gray-400"
                        }`} />
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium text-gray-900">{task.title}</p>
                        {task.description && (
                          <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">{task.description}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={priorityColors[task.priority]}>
                          {task.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {task.assignee.firstName} {task.assignee.lastName}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {task.lead ? (
                          <Link href={`/leads/${task.lead.id}`} className="text-[#dc2626] hover:underline">
                            {task.lead.title}
                          </Link>
                        ) : task.deal ? (
                          <Link href={`/deals/${task.deal.id}`} className="text-blue-600 hover:underline">
                            {task.deal.title}
                          </Link>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {task.dueDate ? (
                          <span className={`text-sm ${isOverdue ? "font-medium text-red-600" : "text-gray-600"}`}>
                            {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <TaskActions taskId={task.id} status={task.status} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
