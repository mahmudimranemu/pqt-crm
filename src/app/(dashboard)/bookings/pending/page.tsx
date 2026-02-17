import { Suspense } from "react";
import Link from "next/link";
import { auth, type ExtendedSession } from "@/lib/auth";
import { getPendingBookings } from "@/lib/actions/bookings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Clock } from "lucide-react";
import { BookingTable } from "../booking-table";

async function PendingBookingsTable({ userRole }: { userRole: string }) {
  const { bookings, total } = await getPendingBookings();

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          {total} pending booking{total !== 1 ? "s" : ""} awaiting outcome
        </p>
      </div>
      <BookingTable bookings={bookings} userRole={userRole} />
    </>
  );
}

export default async function PendingBookingsPage() {
  const session = (await auth()) as ExtendedSession | null;
  const userRole = session?.user?.role || "VIEWER";
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pending Bookings</h1>
          <p className="text-muted-foreground">
            Bookings awaiting completion or outcome update
          </p>
        </div>
        {session?.user?.role !== "VIEWER" && (
          <Link href="/bookings/create">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Booking
            </Button>
          </Link>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Bookings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
            <PendingBookingsTable userRole={userRole} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
