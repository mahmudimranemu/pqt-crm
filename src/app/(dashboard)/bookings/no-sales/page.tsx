import { auth, type ExtendedSession } from "@/lib/auth";
import { getNoSalesBookings } from "@/lib/actions/bookings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookingTable } from "../booking-table";

export default async function NoSalesBookingsPage() {
  const session = (await auth()) as ExtendedSession | null;
  const userRole = session?.user?.role || "VIEWER";
  const { bookings, total } = await getNoSalesBookings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">No Sales Bookings</h1>
        <p className="text-muted-foreground">
          Bookings where the client was not interested
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>No Sales ({total})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BookingTable
            bookings={bookings}
            showOutcome
            showNoSaleReason
            userRole={userRole}
          />
        </CardContent>
      </Card>
    </div>
  );
}
