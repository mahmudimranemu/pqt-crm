import { Suspense } from "react";
import Link from "next/link";
import { getFutureBookings } from "@/lib/actions/bookings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, CalendarDays } from "lucide-react";
import { BookingTable } from "../booking-table";

async function FutureBookingsTable() {
  const { bookings, total } = await getFutureBookings();

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          {total} upcoming booking{total !== 1 ? "s" : ""}
        </p>
      </div>
      <BookingTable bookings={bookings} />
    </>
  );
}

export default function FutureBookingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Future Bookings</h1>
          <p className="text-muted-foreground">
            All upcoming property viewings and appointments
          </p>
        </div>
        <Link href="/bookings/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Booking
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Upcoming Bookings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
            <FutureBookingsTable />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
