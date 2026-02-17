"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { Trash2 } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { deleteBooking, bulkDeleteBookings } from "@/lib/actions/bookings";
import { toast } from "@/components/ui/use-toast";
import type { BookingStatus, BookingOutcome } from "@prisma/client";

interface Booking {
  id: string;
  bookingDate: Date;
  bookingType: string;
  status: BookingStatus;
  outcome: BookingOutcome | null;
  noSaleReason: string | null;
  client: { id: string; firstName: string; lastName: string };
  property: { id: string; name: string; pqtNumber: string; district?: string };
  agent: { id: string; firstName: string; lastName: string };
}

interface BookingTableProps {
  bookings: Booking[];
  showOutcome?: boolean;
  showNoSaleReason?: boolean;
  userRole?: string;
}

const statusColors: Record<
  BookingStatus,
  "default" | "secondary" | "success" | "warning" | "destructive"
> = {
  SCHEDULED: "secondary",
  CONFIRMED: "default",
  COMPLETED: "success",
  NO_SHOW: "destructive",
  CANCELLED: "destructive",
  RESCHEDULED: "warning",
};

const statusLabels: Record<BookingStatus, string> = {
  SCHEDULED: "Scheduled",
  CONFIRMED: "Confirmed",
  COMPLETED: "Completed",
  NO_SHOW: "No Show",
  CANCELLED: "Cancelled",
  RESCHEDULED: "Rescheduled",
};

const outcomeColors: Record<
  BookingOutcome,
  "default" | "secondary" | "success" | "warning" | "destructive"
> = {
  PENDING: "secondary",
  INTERESTED: "default",
  NOT_INTERESTED: "destructive",
  OFFER_MADE: "warning",
  SOLD: "success",
};

const outcomeLabels: Record<BookingOutcome, string> = {
  PENDING: "Pending",
  INTERESTED: "Interested",
  NOT_INTERESTED: "Not Interested",
  OFFER_MADE: "Offer Made",
  SOLD: "Sold",
};

export function BookingTable({
  bookings,
  showOutcome = false,
  showNoSaleReason = false,
  userRole,
}: BookingTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showBulkDelete, setShowBulkDelete] = useState(false);

  const canDelete = userRole === "SUPER_ADMIN";

  const toggleSelectAll = () => {
    if (selectedRows.size === bookings.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(bookings.map((b) => b.id)));
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
        await deleteBooking(deleteId);
        toast({
          title: "Booking deleted",
          description: "The booking has been removed.",
        });
        setDeleteId(null);
        router.refresh();
      } catch {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to delete booking.",
        });
      }
    });
  };

  const handleBulkDelete = () => {
    startTransition(async () => {
      try {
        await bulkDeleteBookings(Array.from(selectedRows));
        toast({
          title: "Bookings deleted",
          description: `${selectedRows.size} booking(s) deleted.`,
        });
        setSelectedRows(new Set());
        setShowBulkDelete(false);
        router.refresh();
      } catch {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to delete bookings.",
        });
      }
    });
  };

  if (bookings.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No bookings found.</p>
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
                  checked={
                    selectedRows.size === bookings.length && bookings.length > 0
                  }
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
            )}
            <TableHead>Date & Time</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Property</TableHead>
            <TableHead>Agent</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            {showOutcome && <TableHead>Outcome</TableHead>}
            {showNoSaleReason && <TableHead>Reason</TableHead>}
            {canDelete && <TableHead className="w-[40px]"></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings.map((booking) => (
            <TableRow
              key={booking.id}
              className={isPending ? "opacity-60" : ""}
            >
              {canDelete && (
                <TableCell>
                  <Checkbox
                    checked={selectedRows.has(booking.id)}
                    onCheckedChange={() => toggleSelectRow(booking.id)}
                  />
                </TableCell>
              )}
              <TableCell className="font-medium">
                {formatDateTime(booking.bookingDate)}
              </TableCell>
              <TableCell>
                <Link
                  href={`/clients/${booking.client.id}`}
                  className="text-gray-900 hover:underline"
                >
                  {booking.client.firstName} {booking.client.lastName}
                </Link>
              </TableCell>
              <TableCell>
                <Link
                  href={`/properties/${booking.property.id}`}
                  className="text-gray-900 hover:underline"
                >
                  {booking.property.name}
                </Link>
                <br />
                <span className="text-xs text-muted-foreground">
                  {booking.property.pqtNumber}
                  {booking.property.district &&
                    ` - ${booking.property.district}`}
                </span>
              </TableCell>
              <TableCell>
                {booking.agent.firstName} {booking.agent.lastName}
              </TableCell>
              <TableCell>{booking.bookingType.replace("_", " ")}</TableCell>
              <TableCell>
                <Badge variant={statusColors[booking.status]}>
                  {statusLabels[booking.status]}
                </Badge>
              </TableCell>
              {showOutcome && (
                <TableCell>
                  {booking.outcome ? (
                    <Badge variant={outcomeColors[booking.outcome]}>
                      {outcomeLabels[booking.outcome]}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
              )}
              {showNoSaleReason && (
                <TableCell className="max-w-[200px] truncate">
                  {booking.noSaleReason || "-"}
                </TableCell>
              )}
              {canDelete && (
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => setDeleteId(booking.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Single Delete Dialog */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Booking</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this booking? This action cannot
              be undone.
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
            <AlertDialogTitle>
              Delete {selectedRows.size} Booking(s)
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedRows.size} selected
              booking(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete {selectedRows.size} Booking(s)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
