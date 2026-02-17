"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { deleteClient, bulkDeleteClients } from "@/lib/actions/clients";
import { toast } from "@/components/ui/use-toast";
import type { ClientStatus } from "@prisma/client";

const statusColors: Record<
  ClientStatus,
  "default" | "secondary" | "success" | "warning" | "destructive"
> = {
  NEW_LEAD: "secondary",
  CONTACTED: "default",
  QUALIFIED: "default",
  VIEWING_SCHEDULED: "warning",
  VIEWED: "warning",
  NEGOTIATING: "warning",
  DEAL_CLOSED: "success",
  LOST: "destructive",
  INACTIVE: "outline" as "default",
};

const statusLabels: Record<ClientStatus, string> = {
  NEW_LEAD: "New Lead",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  VIEWING_SCHEDULED: "Viewing Scheduled",
  VIEWED: "Viewed",
  NEGOTIATING: "Negotiating",
  DEAL_CLOSED: "Deal Closed",
  LOST: "Lost",
  INACTIVE: "Inactive",
};

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  nationality: string;
  budgetMin: unknown;
  budgetMax: unknown;
  status: ClientStatus;
  createdAt: Date | string;
  assignedAgent: { firstName: string; lastName: string } | null;
}

interface ClientsTableContentProps {
  clients: Client[];
  total: number;
  pages: number;
  currentPage: number;
  searchParams: { search?: string; status?: string; agent?: string; source?: string };
  userRole: string;
}

export function ClientsTableContent({
  clients,
  total,
  pages,
  currentPage,
  searchParams,
  userRole,
}: ClientsTableContentProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showBulkDelete, setShowBulkDelete] = useState(false);

  const canDelete = userRole === "SUPER_ADMIN";

  const toggleSelectAll = () => {
    if (selectedRows.size === clients.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(clients.map((c) => c.id)));
    }
  };

  const toggleSelectRow = (id: string) => {
    const next = new Set(selectedRows);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedRows(next);
  };

  const handleDelete = () => {
    if (!deleteId) return;
    startTransition(async () => {
      try {
        await deleteClient(deleteId);
        toast({ title: "Client deleted", description: "The client has been removed." });
        setDeleteId(null);
        router.refresh();
      } catch {
        toast({ variant: "destructive", title: "Error", description: "Failed to delete client." });
      }
    });
  };

  const handleBulkDelete = () => {
    startTransition(async () => {
      try {
        await bulkDeleteClients(Array.from(selectedRows));
        toast({ title: "Clients deleted", description: `${selectedRows.size} client(s) deleted.` });
        setSelectedRows(new Set());
        setShowBulkDelete(false);
        router.refresh();
      } catch {
        toast({ variant: "destructive", title: "Error", description: "Failed to delete clients." });
      }
    });
  };

  if (clients.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No clients found.</p>
        <Link href="/clients/create">
          <Button className="mt-4">
            <Plus className="mr-2 h-4 w-4" />
            Add Your First Client
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Bulk Delete Bar */}
      {canDelete && selectedRows.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 mb-4">
          <span className="text-sm font-medium text-red-700">
            {selectedRows.size} selected
          </span>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setShowBulkDelete(true)}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete Selected
          </Button>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            {canDelete && (
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={selectedRows.size === clients.length && clients.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
            )}
            <TableHead>Name</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Nationality</TableHead>
            <TableHead>Budget</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Agent</TableHead>
            <TableHead>Created</TableHead>
            {canDelete && <TableHead className="w-[60px]">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => (
            <TableRow key={client.id} className={isPending ? "opacity-60" : ""}>
              {canDelete && (
                <TableCell>
                  <Checkbox
                    checked={selectedRows.has(client.id)}
                    onCheckedChange={() => toggleSelectRow(client.id)}
                  />
                </TableCell>
              )}
              <TableCell>
                <Link
                  href={`/clients/${client.id}`}
                  className="font-medium text-gray-900 hover:underline"
                >
                  {client.firstName} {client.lastName}
                </Link>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  <div>{client.email}</div>
                  <div className="text-muted-foreground">{client.phone}</div>
                </div>
              </TableCell>
              <TableCell>{client.nationality}</TableCell>
              <TableCell>
                <span className="text-sm">
                  {formatCurrency(Number(client.budgetMin))} -{" "}
                  {formatCurrency(Number(client.budgetMax))}
                </span>
              </TableCell>
              <TableCell>
                <Badge variant={statusColors[client.status]}>
                  {statusLabels[client.status]}
                </Badge>
              </TableCell>
              <TableCell>
                {client.assignedAgent ? (
                  <span className="text-sm">
                    {client.assignedAgent.firstName}{" "}
                    {client.assignedAgent.lastName}
                  </span>
                ) : (
                  <span className="text-muted-foreground text-sm">
                    Unassigned
                  </span>
                )}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDate(client.createdAt)}
              </TableCell>
              {canDelete && (
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => setDeleteId(client.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between px-2 py-4">
          <p className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * 25 + 1} to{" "}
            {Math.min(currentPage * 25, total)} of {total} clients
          </p>
          <div className="flex gap-2">
            {currentPage > 1 && (
              <Link
                href={`/clients?page=${currentPage - 1}${searchParams.search ? `&search=${searchParams.search}` : ""}${searchParams.status ? `&status=${searchParams.status}` : ""}`}
              >
                <Button variant="outline" size="sm">
                  Previous
                </Button>
              </Link>
            )}
            {currentPage < pages && (
              <Link
                href={`/clients?page=${currentPage + 1}${searchParams.search ? `&search=${searchParams.search}` : ""}${searchParams.status ? `&status=${searchParams.status}` : ""}`}
              >
                <Button variant="outline" size="sm">
                  Next
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Single Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this client? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Dialog */}
      <AlertDialog open={showBulkDelete} onOpenChange={setShowBulkDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedRows.size} Client(s)</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedRows.size} selected client(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete {selectedRows.size} Client(s)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
