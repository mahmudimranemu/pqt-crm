import { getBookingFormData } from "@/lib/actions/bookings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookingForm } from "./booking-form";

export default async function CreateBookingPage() {
  const { clients, properties, agents } = await getBookingFormData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create Booking</h1>
        <p className="text-muted-foreground">
          Schedule a new property viewing
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Booking Details</CardTitle>
        </CardHeader>
        <CardContent>
          <BookingForm
            clients={clients}
            properties={properties}
            agents={agents}
          />
        </CardContent>
      </Card>
    </div>
  );
}
