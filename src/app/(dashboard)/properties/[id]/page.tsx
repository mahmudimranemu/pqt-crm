import { notFound } from "next/navigation";
import Link from "next/link";
import { auth, type ExtendedSession } from "@/lib/auth";
import { fetchPropertyBySlug } from "@/lib/api/external-properties";
import type { DisplayProperty } from "@/lib/api/external-properties";
import { getProperty } from "@/lib/actions/properties";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  MapPin,
  DollarSign,
  Home,
  Building2,
  Calendar,
  Flag,
  Maximize,
  Bed,
  Bath,
  TrendingUp,
  Shield,
  Navigation,
  Star,
  Sparkles,
  Zap,
} from "lucide-react";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import type { PropertyStatus, BookingStatus } from "@prisma/client";

interface PageProps {
  params: Promise<{ id: string }>;
}

// --- External API property detail ---

function ExternalPropertyDetail({ property }: { property: DisplayProperty }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/properties">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm text-[#dc2626] font-medium">
                REF-{property.reference}
              </p>
              <Badge variant="secondary">{property.status}</Badge>
              {property.citizenshipEligible && (
                <Badge variant="secondary" className="gap-1">
                  <Flag className="h-3 w-3 text-[#dc2626]" />
                  Citizenship Eligible
                </Badge>
              )}
              {property.featured && (
                <Badge className="bg-yellow-500 text-white gap-1">
                  <Star className="h-3 w-3" />
                  Featured
                </Badge>
              )}
              {property.newListing && (
                <Badge className="bg-green-500 text-white gap-1">
                  <Sparkles className="h-3 w-3" />
                  New Listing
                </Badge>
              )}
              {property.urgentSale && (
                <Badge className="bg-red-600 text-white gap-1">
                  <Zap className="h-3 w-3" />
                  Urgent Sale
                </Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">
              {property.name}
            </h1>
            <p className="text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="h-4 w-4" />
              {property.district ? `${property.district}, ` : ""}
              {property.city}, {property.country}
            </p>
          </div>
        </div>
      </div>

      {/* Featured Image + Gallery */}
      {property.imageUrl && (
        <div className="space-y-3">
          <div className="rounded-lg overflow-hidden h-[400px] bg-gray-100">
            <img
              src={property.imageUrl}
              alt={property.name}
              className="w-full h-full object-cover"
            />
          </div>
          {property.galleryUrls.length > 0 && (
            <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
              {property.galleryUrls.slice(0, 6).map((url, i) => (
                <div
                  key={i}
                  className="rounded-lg overflow-hidden h-20 bg-gray-100"
                >
                  <img
                    src={url}
                    alt={`${property.name} - ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
              {property.galleryUrls.length > 6 && (
                <div className="rounded-lg h-20 bg-gray-100 flex items-center justify-center text-sm text-muted-foreground font-medium">
                  +{property.galleryUrls.length - 6} more
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-sm">Price</span>
            </div>
            <p className="font-semibold text-lg">
              {formatCurrency(property.price)}
            </p>
            {property.priceNegotiable && (
              <p className="text-xs text-muted-foreground">Negotiable</p>
            )}
            {property.downPaymentPercentage && (
              <p className="text-xs text-muted-foreground">
                {property.downPaymentPercentage}% down payment
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Bed className="h-4 w-4" />
              <span className="text-sm">Bedrooms</span>
            </div>
            <p className="font-semibold text-lg">
              {property.roomConfiguration ||
                (property.bedrooms ? `${property.bedrooms} bed` : "N/A")}
            </p>
            {property.bathrooms && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Bath className="h-3 w-3" />
                {property.bathrooms} bathroom{property.bathrooms > 1 ? "s" : ""}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Maximize className="h-4 w-4" />
              <span className="text-sm">Area</span>
            </div>
            <p className="font-semibold text-lg">
              {property.grossArea ? `${property.grossArea} m²` : "N/A"}
            </p>
            {property.netArea && (
              <p className="text-xs text-muted-foreground">
                {property.netArea} m² net
              </p>
            )}
          </CardContent>
        </Card>
        {property.roiPercentage && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">ROI</span>
              </div>
              <p className="font-semibold text-lg text-[#dc2626]">
                {property.roiPercentage}%
              </p>
              {property.rentalGuaranteePercentage && (
                <p className="text-xs text-muted-foreground">
                  {property.rentalGuaranteePercentage}% rental guarantee
                </p>
              )}
            </CardContent>
          </Card>
        )}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Shield className="h-4 w-4" />
              <span className="text-sm">Title Deed</span>
            </div>
            <p className="font-semibold text-lg">
              {property.titleDeedStatus || "N/A"}
            </p>
            {property.developmentStatus && (
              <p className="text-xs text-muted-foreground">
                {property.developmentStatus}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Property Details */}
        <Card>
          <CardHeader>
            <CardTitle>Property Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <p className="font-medium">{property.type}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Category</p>
                <p className="font-medium">{property.category}</p>
              </div>
              {property.constructionYear && (
                <div>
                  <p className="text-sm text-muted-foreground">
                    Construction Year
                  </p>
                  <p className="font-medium">{property.constructionYear}</p>
                </div>
              )}
              {property.furnished && (
                <div>
                  <p className="text-sm text-muted-foreground">Furnished</p>
                  <p className="font-medium">{property.furnished}</p>
                </div>
              )}
              {property.parkingType && (
                <div>
                  <p className="text-sm text-muted-foreground">Parking</p>
                  <p className="font-medium">{property.parkingType}</p>
                </div>
              )}
              {property.plotSize && (
                <div>
                  <p className="text-sm text-muted-foreground">Plot Size</p>
                  <p className="font-medium">
                    {property.plotSize.toLocaleString()} m²
                  </p>
                </div>
              )}
            </div>

            {property.amenities.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Amenities</p>
                <div className="flex flex-wrap gap-2">
                  {property.amenities.map((amenity) => (
                    <Badge key={amenity} variant="outline">
                      {amenity}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {property.keyFeatures.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Key Features
                </p>
                <div className="flex flex-wrap gap-2">
                  {property.keyFeatures.map((feature, i) => (
                    <Badge key={i} variant="outline">
                      {feature}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Description */}
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {property.shortDescription && (
              <p className="text-sm text-muted-foreground italic">
                {property.shortDescription}
              </p>
            )}
            {property.fullDescription && (
              <p className="whitespace-pre-wrap text-sm">
                {property.fullDescription}
              </p>
            )}
            {!property.shortDescription && !property.fullDescription && (
              <p className="text-muted-foreground">No description available.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Distances */}
      {property.distances.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Navigation className="h-5 w-5" />
              Distances
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {property.distances.map((d) => (
                <div key={d.label}>
                  <p className="text-sm text-muted-foreground">{d.label}</p>
                  <p className="font-medium">{d.value} km</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Investment Info */}
      {(property.citizenshipEligible ||
        property.roiPercentage ||
        property.investmentHighlights.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Investment Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {property.citizenshipEligible && (
                <div>
                  <p className="text-sm text-muted-foreground">Citizenship</p>
                  <p className="font-medium text-[#dc2626]">Eligible</p>
                </div>
              )}
              {property.residencePermitEligible && (
                <div>
                  <p className="text-sm text-muted-foreground">
                    Residence Permit
                  </p>
                  <p className="font-medium text-green-600">Eligible</p>
                </div>
              )}
              {property.roiPercentage && (
                <div>
                  <p className="text-sm text-muted-foreground">Expected ROI</p>
                  <p className="font-medium">{property.roiPercentage}%</p>
                </div>
              )}
              {property.rentalGuaranteePercentage && (
                <div>
                  <p className="text-sm text-muted-foreground">
                    Rental Guarantee
                  </p>
                  <p className="font-medium">
                    {property.rentalGuaranteePercentage}%
                  </p>
                </div>
              )}
            </div>

            {property.investmentHighlights.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Investment Highlights
                </p>
                <ul className="space-y-1">
                  {property.investmentHighlights.map((highlight, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-[#dc2626] mt-1">•</span>
                      {highlight}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// --- Legacy local DB property detail (for bookings/sales) ---

const statusColors: Record<
  PropertyStatus,
  "default" | "secondary" | "success" | "warning" | "destructive"
> = {
  ACTIVE: "success",
  SOLD_OUT: "destructive",
  COMING_SOON: "secondary",
  OFF_MARKET: "default",
};

const statusLabels: Record<PropertyStatus, string> = {
  ACTIVE: "Active",
  SOLD_OUT: "Sold Out",
  COMING_SOON: "Coming Soon",
  OFF_MARKET: "Off Market",
};

const bookingStatusColors: Record<
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

export default async function PropertyDetailPage({ params }: PageProps) {
  const session = (await auth()) as ExtendedSession | null;
  const { id } = await params;

  // Try external API first (by slug or numeric id)
  const externalProperty = await fetchPropertyBySlug(id);
  if (externalProperty) {
    return <ExternalPropertyDetail property={externalProperty} />;
  }

  // Fallback to local database (for legacy properties with bookings/sales)
  const property = await getProperty(id);
  if (!property) {
    notFound();
  }

  const totalSalesValue = property.sales.reduce(
    (sum, sale) => sum + Number(sale.salePrice),
    0,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/properties">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <p className="text-sm text-[#dc2626] font-medium">
                {property.pqtNumber}
              </p>
              <Badge variant={statusColors[property.status]}>
                {statusLabels[property.status]}
              </Badge>
              {property.citizenshipEligible && (
                <Badge variant="secondary" className="gap-1">
                  <Flag className="h-3 w-3" />
                  Citizenship Eligible
                </Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              {property.name}
            </h1>
            {property.developer && (
              <p className="text-muted-foreground">by {property.developer}</p>
            )}
          </div>
        </div>
        {session?.user?.role !== "VIEWER" && (
          <Link href={`/properties/${property.id}/edit`}>
            <Button>
              <Edit className="mr-2 h-4 w-4" />
              Edit Property
            </Button>
          </Link>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <MapPin className="h-4 w-4" />
              <span className="text-sm">Location</span>
            </div>
            <p className="font-medium">{property.district.replace("_", " ")}</p>
            {property.address && (
              <p className="text-sm text-muted-foreground">
                {property.address}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-sm">Price Range</span>
            </div>
            <p className="font-medium">
              {formatCurrency(Number(property.priceFrom))}
            </p>
            {Number(property.priceTo) > Number(property.priceFrom) && (
              <p className="text-sm text-muted-foreground">
                to {formatCurrency(Number(property.priceTo))}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Home className="h-4 w-4" />
              <span className="text-sm">Units</span>
            </div>
            <p className="font-medium">
              {property.availableUnits ?? 0} available
            </p>
            <p className="text-sm text-muted-foreground">
              of {property.totalUnits ?? 0} total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Maximize className="h-4 w-4" />
              <span className="text-sm">Size Range</span>
            </div>
            <p className="font-medium">
              {property.sizeFrom ? `${Number(property.sizeFrom)} sqm` : "N/A"}
            </p>
            {property.sizeTo &&
              Number(property.sizeTo) > Number(property.sizeFrom) && (
                <p className="text-sm text-muted-foreground">
                  to {Number(property.sizeTo)} sqm
                </p>
              )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-sm">Total Sales</span>
            </div>
            <p className="font-medium">{property.sales.length} sales</p>
            <p className="text-sm text-muted-foreground">
              {formatCurrency(totalSalesValue)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Property Details */}
        <Card>
          <CardHeader>
            <CardTitle>Property Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Property Type</p>
                <p className="font-medium">{property.propertyType}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Bedrooms</p>
                <p className="font-medium">{property.bedrooms || "N/A"}</p>
              </div>
              {property.completionDate && (
                <div>
                  <p className="text-sm text-muted-foreground">
                    Completion Date
                  </p>
                  <p className="font-medium">
                    {formatDate(property.completionDate)}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="font-medium">{formatDate(property.createdAt)}</p>
              </div>
            </div>

            {property.amenities.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Amenities</p>
                <div className="flex flex-wrap gap-2">
                  {property.amenities.map((amenity) => (
                    <Badge key={amenity} variant="outline">
                      {amenity}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Description */}
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            {property.description ? (
              <p className="whitespace-pre-wrap">{property.description}</p>
            ) : (
              <p className="text-muted-foreground">No description added yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Bookings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Bookings</CardTitle>
          {session?.user?.role !== "VIEWER" && (
            <Link href={`/bookings/create?propertyId=${property.id}`}>
              <Button size="sm">
                <Calendar className="mr-2 h-4 w-4" />
                New Booking
              </Button>
            </Link>
          )}
        </CardHeader>
        <CardContent>
          {property.bookings.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No bookings yet for this property.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {property.bookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>{formatDateTime(booking.bookingDate)}</TableCell>
                    <TableCell>
                      <Link
                        href={`/clients/${booking.client.id}`}
                        className="text-gray-900 hover:underline"
                      >
                        {booking.client.firstName} {booking.client.lastName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {booking.agent.firstName} {booking.agent.lastName}
                    </TableCell>
                    <TableCell>
                      {booking.bookingType.replace("_", " ")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={bookingStatusColors[booking.status]}>
                        {booking.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Sales History */}
      {property.sales.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Sales History</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Sale Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Citizenship</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {property.sales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>{formatDate(sale.createdAt)}</TableCell>
                    <TableCell>
                      <Link
                        href={`/clients/${sale.client.id}`}
                        className="text-gray-900 hover:underline"
                      >
                        {sale.client.firstName} {sale.client.lastName}
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
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
