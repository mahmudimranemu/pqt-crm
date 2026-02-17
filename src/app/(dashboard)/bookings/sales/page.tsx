import { auth, type ExtendedSession } from "@/lib/auth";
import { getSalesBookings } from "@/lib/actions/bookings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookingTable } from "../booking-table";

export default async function SalesBookingsPage() {
  const session = (await auth()) as ExtendedSession | null;
  const userRole = session?.user?.role || "VIEWER";
  const { bookings, total } = await getSalesBookings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sales Bookings</h1>
        <p className="text-muted-foreground">
          Bookings that resulted in a sale
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Successful Sales ({total})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BookingTable bookings={bookings} showOutcome userRole={userRole} />
        </CardContent>
      </Card>
    </div>
  );
}
