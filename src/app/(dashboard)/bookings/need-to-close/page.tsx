import { getNeedToCloseBookings } from "@/lib/actions/bookings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils";
import { Phone, Mail } from "lucide-react";

export default async function NeedToClosePage() {
  const { bookings, total } = await getNeedToCloseBookings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Need to Close</h1>
        <p className="text-muted-foreground">
          Clients who have made an offer and need follow-up to close the sale
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Offers Made ({total})</span>
            <Badge variant="warning">Priority Follow-up</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No bookings need closing at the moment.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Booking Date</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Days Since Offer</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((booking) => {
                  const daysSinceOffer = Math.floor(
                    (new Date().getTime() - new Date(booking.updatedAt).getTime()) /
                      (1000 * 60 * 60 * 24)
                  );
                  return (
                    <TableRow key={booking.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/clients/${booking.client.id}`}
                          className="text-gray-900 hover:underline"
                        >
                          {booking.client.firstName} {booking.client.lastName}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {booking.client.phone && (
                            <a
                              href={`tel:${booking.client.phone}`}
                              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-gray-900"
                            >
                              <Phone className="h-3 w-3" />
                              {booking.client.phone}
                            </a>
                          )}
                          {booking.client.email && (
                            <a
                              href={`mailto:${booking.client.email}`}
                              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-gray-900"
                            >
                              <Mail className="h-3 w-3" />
                              {booking.client.email}
                            </a>
                          )}
                        </div>
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
                        </span>
                      </TableCell>
                      <TableCell>{formatDateTime(booking.bookingDate)}</TableCell>
                      <TableCell>
                        {booking.agent.firstName} {booking.agent.lastName}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            daysSinceOffer > 7
                              ? "destructive"
                              : daysSinceOffer > 3
                              ? "warning"
                              : "default"
                          }
                        >
                          {daysSinceOffer} day{daysSinceOffer !== 1 ? "s" : ""}
                        </Badge>
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
