"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils";
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
}

const statusColors: Record<BookingStatus, "default" | "secondary" | "success" | "warning" | "destructive"> = {
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

const outcomeColors: Record<BookingOutcome, "default" | "secondary" | "success" | "warning" | "destructive"> = {
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

export function BookingTable({ bookings, showOutcome = false, showNoSaleReason = false }: BookingTableProps) {
  if (bookings.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No bookings found.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date & Time</TableHead>
          <TableHead>Client</TableHead>
          <TableHead>Property</TableHead>
          <TableHead>Agent</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
          {showOutcome && <TableHead>Outcome</TableHead>}
          {showNoSaleReason && <TableHead>Reason</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {bookings.map((booking) => (
          <TableRow key={booking.id}>
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
                {booking.property.district && ` - ${booking.property.district}`}
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
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
