"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Calendar, MapPin, User } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import type { BookingStatus } from "@prisma/client";

interface CalendarBooking {
  id: string;
  bookingDate: string;
  bookingType: string;
  status: BookingStatus;
  client: { id: string; firstName: string; lastName: string };
  property: { id: string; name: string; pqtNumber: string };
  agent: { id: string; firstName: string; lastName: string };
}

const statusColors: Record<BookingStatus, string> = {
  SCHEDULED: "#dc2626",
  CONFIRMED: "#991b1b",
  COMPLETED: "#22c55e",
  NO_SHOW: "#dc2626",
  CANCELLED: "#dc2626",
  RESCHEDULED: "#f59e0b",
};

const statusLabels: Record<BookingStatus, string> = {
  SCHEDULED: "Scheduled",
  CONFIRMED: "Confirmed",
  COMPLETED: "Completed",
  NO_SHOW: "No Show",
  CANCELLED: "Cancelled",
  RESCHEDULED: "Rescheduled",
};

export default function BookingCalendarPage() {
  const [bookings, setBookings] = useState<CalendarBooking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<CalendarBooking | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBookings = async (start: Date, end: Date) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/bookings/calendar?start=${start.toISOString()}&end=${end.toISOString()}`
      );
      if (response.ok) {
        const data = await response.json();
        setBookings(data);
      }
    } catch (error) {
      console.error("Failed to fetch bookings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    fetchBookings(start, end);
  }, []);

  const events = bookings.map((booking) => ({
    id: booking.id,
    title: `${booking.client.firstName} ${booking.client.lastName} - ${booking.property.name}`,
    start: booking.bookingDate,
    backgroundColor: statusColors[booking.status],
    borderColor: statusColors[booking.status],
    extendedProps: booking,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Booking Calendar</h1>
          <p className="text-muted-foreground">
            View and manage property viewings and appointments
          </p>
        </div>
        <Link href="/bookings/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Booking
          </Button>
        </Link>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        {Object.entries(statusColors).map(([status, color]) => (
          <div key={status} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-sm">{statusLabels[status as BookingStatus]}</span>
          </div>
        ))}
      </div>

      {/* Calendar */}
      <Card>
        <CardContent className="p-4">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay",
            }}
            events={events}
            eventClick={(info) => {
              setSelectedBooking(info.event.extendedProps as CalendarBooking);
            }}
            datesSet={(dateInfo) => {
              fetchBookings(dateInfo.start, dateInfo.end);
            }}
            height="auto"
            eventTimeFormat={{
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            }}
          />
        </CardContent>
      </Card>

      {/* Booking Detail Dialog */}
      <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge
                  style={{ backgroundColor: statusColors[selectedBooking.status] }}
                  className="text-white"
                >
                  {statusLabels[selectedBooking.status]}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {selectedBooking.bookingType.replace("_", " ")}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Date & Time</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(selectedBooking.bookingDate)}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Client</p>
                    <Link
                      href={`/clients/${selectedBooking.client.id}`}
                      className="text-sm text-gray-900 hover:underline"
                    >
                      {selectedBooking.client.firstName} {selectedBooking.client.lastName}
                    </Link>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Property</p>
                    <Link
                      href={`/properties/${selectedBooking.property.id}`}
                      className="text-sm text-gray-900 hover:underline"
                    >
                      {selectedBooking.property.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {selectedBooking.property.pqtNumber}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Agent</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedBooking.agent.firstName} {selectedBooking.agent.lastName}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Link href={`/bookings/${selectedBooking.id}`} className="flex-1">
                  <Button className="w-full">View Details</Button>
                </Link>
                <Button variant="outline" onClick={() => setSelectedBooking(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
