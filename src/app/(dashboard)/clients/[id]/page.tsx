import { notFound } from "next/navigation";
import Link from "next/link";
import { getClient, getAgentsForAssignment } from "@/lib/actions/clients";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Edit,
  Mail,
  Phone,
  MapPin,
  DollarSign,
  Calendar,
  MessageSquare,
  FileText,
  Flag
} from "lucide-react";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import type { ClientStatus, BookingStatus, BookingOutcome } from "@prisma/client";

interface PageProps {
  params: Promise<{ id: string }>;
}

const statusColors: Record<ClientStatus, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  NEW_LEAD: "secondary",
  CONTACTED: "default",
  QUALIFIED: "default",
  VIEWING_SCHEDULED: "warning",
  VIEWED: "warning",
  NEGOTIATING: "warning",
  DEAL_CLOSED: "success",
  LOST: "destructive",
  INACTIVE: "default",
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

const bookingStatusLabels: Record<BookingStatus, string> = {
  SCHEDULED: "Scheduled",
  CONFIRMED: "Confirmed",
  COMPLETED: "Completed",
  NO_SHOW: "No Show",
  CANCELLED: "Cancelled",
  RESCHEDULED: "Rescheduled",
};

const bookingOutcomeLabels: Record<BookingOutcome, string> = {
  PENDING: "Pending",
  INTERESTED: "Interested",
  NOT_INTERESTED: "Not Interested",
  OFFER_MADE: "Offer Made",
  SOLD: "Sold",
};

export default async function ClientDetailPage({ params }: PageProps) {
  const { id } = await params;
  const client = await getClient(id);

  if (!client) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/clients">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {client.firstName} {client.lastName}
              </h1>
              <Badge variant={statusColors[client.status]}>
                {statusLabels[client.status]}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {client.assignedAgent
                ? `Assigned to ${client.assignedAgent.firstName} ${client.assignedAgent.lastName}`
                : "Unassigned"}
            </p>
          </div>
        </div>
        <Link href={`/clients/${client.id}/edit`}>
          <Button>
            <Edit className="mr-2 h-4 w-4" />
            Edit Client
          </Button>
        </Link>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Mail className="h-4 w-4" />
              <span className="text-sm">Email</span>
            </div>
            <p className="font-medium">{client.email}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Phone className="h-4 w-4" />
              <span className="text-sm">Phone</span>
            </div>
            <p className="font-medium">{client.phone}</p>
            {client.whatsapp && (
              <p className="text-sm text-muted-foreground">WhatsApp: {client.whatsapp}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <MapPin className="h-4 w-4" />
              <span className="text-sm">Location</span>
            </div>
            <p className="font-medium">{client.nationality}</p>
            <p className="text-sm text-muted-foreground">
              {client.city ? `${client.city}, ` : ""}{client.country}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-sm">Budget</span>
            </div>
            <p className="font-medium">
              {formatCurrency(Number(client.budgetMin))} - {formatCurrency(Number(client.budgetMax))}
            </p>
            <p className="text-sm text-muted-foreground">
              {client.investmentPurpose.replace("_", " ")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="bookings">
            Bookings ({client.bookings.length})
          </TabsTrigger>
          <TabsTrigger value="communications">
            Communications ({client.communications.length})
          </TabsTrigger>
          <TabsTrigger value="sales">
            Sales ({client.sales.length})
          </TabsTrigger>
          <TabsTrigger value="citizenship">
            Citizenship ({client.citizenshipApplications.length})
          </TabsTrigger>
          <TabsTrigger value="documents">
            Documents ({client.documents.length})
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Client Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Source</p>
                    <p className="font-medium">{client.source.replace("_", " ")}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Property Type</p>
                    <p className="font-medium">
                      {client.preferredPropertyType?.replace("_", " ") || "Not specified"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p className="font-medium">{formatDate(client.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Last Updated</p>
                    <p className="font-medium">{formatDate(client.updatedAt)}</p>
                  </div>
                </div>
                {client.preferredDistricts.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Preferred Districts</p>
                    <div className="flex flex-wrap gap-2">
                      {client.preferredDistricts.map((district) => (
                        <Badge key={district} variant="outline">
                          {district.replace("_", " ")}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                {client.notes ? (
                  <p className="whitespace-pre-wrap">{client.notes}</p>
                ) : (
                  <p className="text-muted-foreground">No notes added yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Bookings Tab */}
        <TabsContent value="bookings">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Bookings</CardTitle>
              <Link href={`/bookings/create?clientId=${client.id}`}>
                <Button size="sm">
                  <Calendar className="mr-2 h-4 w-4" />
                  New Booking
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {client.bookings.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No bookings yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Property</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Outcome</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {client.bookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell>{formatDateTime(booking.bookingDate)}</TableCell>
                        <TableCell>
                          <Link
                            href={`/properties/${booking.property.id}`}
                            className="text-gray-900 hover:underline"
                          >
                            {booking.property.name}
                          </Link>
                          <br />
                          <span className="text-sm text-muted-foreground">
                            {booking.property.pqtNumber}
                          </span>
                        </TableCell>
                        <TableCell>{booking.bookingType.replace("_", " ")}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {bookingStatusLabels[booking.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {booking.outcome ? (
                            <Badge
                              variant={
                                booking.outcome === "SOLD"
                                  ? "success"
                                  : booking.outcome === "NOT_INTERESTED"
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {bookingOutcomeLabels[booking.outcome]}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Communications Tab */}
        <TabsContent value="communications">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Communications</CardTitle>
              <Button size="sm">
                <MessageSquare className="mr-2 h-4 w-4" />
                Log Communication
              </Button>
            </CardHeader>
            <CardContent>
              {client.communications.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No communications logged yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {client.communications.map((comm) => (
                    <div
                      key={comm.id}
                      className="border-l-2 border-[#dc2626] pl-4 py-2"
                    >
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline">{comm.type}</Badge>
                        <span>{comm.direction}</span>
                        <span>by {comm.agent.firstName} {comm.agent.lastName}</span>
                        <span>{formatDateTime(comm.createdAt)}</span>
                      </div>
                      {comm.subject && (
                        <p className="font-medium mt-1">{comm.subject}</p>
                      )}
                      {comm.content && (
                        <p className="text-sm mt-1">{comm.content}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sales Tab */}
        <TabsContent value="sales">
          <Card>
            <CardHeader>
              <CardTitle>Sales</CardTitle>
            </CardHeader>
            <CardContent>
              {client.sales.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No sales completed yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Property</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Sale Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Citizenship Eligible</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {client.sales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell>
                          <Link
                            href={`/properties/${sale.property.id}`}
                            className="text-gray-900 hover:underline"
                          >
                            {sale.property.name}
                          </Link>
                        </TableCell>
                        <TableCell>{sale.unitNumber || "-"}</TableCell>
                        <TableCell>
                          {formatCurrency(Number(sale.salePrice))}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {sale.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {sale.citizenshipEligible ? (
                            <Badge variant="success">Eligible</Badge>
                          ) : (
                            <span className="text-muted-foreground">No</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Citizenship Tab */}
        <TabsContent value="citizenship">
          <Card>
            <CardHeader>
              <CardTitle>Citizenship Applications</CardTitle>
            </CardHeader>
            <CardContent>
              {client.citizenshipApplications.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No citizenship applications yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {client.citizenshipApplications.map((app) => (
                    <div key={app.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Flag className="h-4 w-4 text-[#dc2626]" />
                          <span className="font-medium">
                            {app.applicationNumber || "Application"}
                          </span>
                        </div>
                        <Badge
                          variant={
                            app.stage === "APPROVED" || app.stage === "PASSPORT_ISSUED"
                              ? "success"
                              : app.stage === "REJECTED"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {app.stage.replace("_", " ")}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Property: {app.sale.property.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Started: {formatDate(app.startDate)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Documents</CardTitle>
              <Button size="sm">
                <FileText className="mr-2 h-4 w-4" />
                Upload Document
              </Button>
            </CardHeader>
            <CardContent>
              {client.documents.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No documents uploaded yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Uploaded</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {client.documents.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">{doc.name}</TableCell>
                        <TableCell>{doc.category.replace("_", " ")}</TableCell>
                        <TableCell>{doc.fileType.toUpperCase()}</TableCell>
                        <TableCell>{formatDate(doc.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
