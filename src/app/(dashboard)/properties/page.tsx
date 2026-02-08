import { Suspense } from "react";
import Link from "next/link";
import { fetchProperties } from "@/lib/api/external-properties";
import type { DisplayProperty } from "@/lib/api/external-properties";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  MapPin,
  DollarSign,
  Home,
  Flag,
  Star,
  Zap,
  Sparkles,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { PropertyFilters } from "./property-filters";
import { PropertyPagination } from "./property-pagination";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    district?: string;
    type?: string;
    citizenship?: string;
    page?: string;
    perPage?: string;
  }>;
}

function filterProperties(
  properties: DisplayProperty[],
  params: {
    search?: string;
    district?: string;
    type?: string;
    citizenship?: string;
  },
): DisplayProperty[] {
  let filtered = properties;

  if (params.search) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.reference.toLowerCase().includes(q) ||
        p.district.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q),
    );
  }

  if (params.district && params.district !== "all") {
    filtered = filtered.filter(
      (p) => p.district.toLowerCase() === params.district!.toLowerCase(),
    );
  }

  if (params.type && params.type !== "all") {
    filtered = filtered.filter(
      (p) => p.type.toLowerCase() === params.type!.toLowerCase(),
    );
  }

  if (params.citizenship === "true") {
    filtered = filtered.filter((p) => p.citizenshipEligible);
  }

  return filtered;
}

async function PropertiesGrid({
  searchParams,
}: {
  searchParams: PageProps["searchParams"];
}) {
  const params = await searchParams;
  const allProperties = await fetchProperties();
  const filtered = filterProperties(allProperties, params);

  if (filtered.length === 0) {
    return (
      <div className="text-center py-12">
        <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No properties found.</p>
      </div>
    );
  }

  // Pagination
  const perPageParam = params.perPage;
  const showAll = perPageParam === "all";
  const perPage = showAll
    ? filtered.length
    : Math.max(1, parseInt(perPageParam || "9", 10));
  const totalPages = showAll ? 1 : Math.ceil(filtered.length / perPage);
  const currentPage = Math.min(
    Math.max(1, parseInt(params.page || "1", 10)),
    totalPages,
  );
  const startIndex = (currentPage - 1) * perPage;
  const endIndex = Math.min(startIndex + perPage, filtered.length);
  const properties = filtered.slice(startIndex, endIndex);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {properties.map((property) => (
          <Link key={property.id} href={`/properties/${property.slug}`}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full overflow-hidden">
              {/* Property Image */}
              <div className="h-48 relative overflow-hidden bg-gradient-to-br from-[#dc2626] to-[#991b1b]">
                {property.imageUrl ? (
                  <img
                    src={property.imageUrl}
                    alt={property.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Building2 className="h-16 w-16 text-white/30" />
                  </div>
                )}
                {/* Badges overlay */}
                <div className="absolute top-3 left-3 flex gap-1.5">
                  <Badge
                    variant="secondary"
                    className="bg-white/90 text-gray-800"
                  >
                    {property.status}
                  </Badge>
                  {property.featured && (
                    <Badge className="bg-yellow-500 text-white gap-1">
                      <Star className="h-3 w-3" />
                      Featured
                    </Badge>
                  )}
                </div>
                <div className="absolute top-3 right-3 flex flex-col gap-1.5">
                  {property.citizenshipEligible && (
                    <Badge variant="secondary" className="bg-white/90 gap-1">
                      <Flag className="h-3 w-3 text-[#dc2626]" />
                      Citizenship
                    </Badge>
                  )}
                  {property.newListing && (
                    <Badge className="bg-green-500 text-white gap-1">
                      <Sparkles className="h-3 w-3" />
                      New
                    </Badge>
                  )}
                  {property.urgentSale && (
                    <Badge className="bg-red-600 text-white gap-1">
                      <Zap className="h-3 w-3" />
                      Urgent
                    </Badge>
                  )}
                </div>
              </div>

              <CardContent className="p-4 space-y-3">
                {/* Title & Reference */}
                <div>
                  <p className="text-xs text-[#dc2626] font-medium">
                    REF-{property.reference}
                  </p>
                  <h3 className="font-semibold text-lg text-gray-900 line-clamp-2">
                    {property.name}
                  </h3>
                </div>

                {/* Location */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span>
                    {property.district ? `${property.district}, ` : ""}
                    {property.city}
                  </span>
                </div>

                {/* Property Type & Bedrooms */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Home className="h-4 w-4 shrink-0" />
                  <span>{property.type}</span>
                  {property.roomConfiguration && (
                    <span className="text-xs">
                      ({property.roomConfiguration})
                    </span>
                  )}
                  {!property.roomConfiguration && property.bedrooms && (
                    <span className="text-xs">({property.bedrooms} bed)</span>
                  )}
                </div>

                {/* Price */}
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-[#dc2626] shrink-0" />
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(property.price)}
                  </span>
                  {property.priceNegotiable && (
                    <span className="text-xs text-muted-foreground">
                      (Negotiable)
                    </span>
                  )}
                </div>

                {/* Area */}
                {(property.grossArea || property.netArea) && (
                  <div className="text-sm text-muted-foreground">
                    {property.grossArea && (
                      <span>{property.grossArea} m² gross</span>
                    )}
                    {property.grossArea && property.netArea && <span> · </span>}
                    {property.netArea && <span>{property.netArea} m² net</span>}
                  </div>
                )}

                {/* ROI if available */}
                {property.roiPercentage && (
                  <div className="text-sm">
                    <span className="text-[#dc2626] font-medium">
                      {property.roiPercentage}% ROI
                    </span>
                    {property.rentalGuaranteePercentage && (
                      <span className="text-muted-foreground">
                        {" "}
                        · {property.rentalGuaranteePercentage}% rental guarantee
                      </span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <PropertyPagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filtered.length}
        startIndex={startIndex}
        endIndex={endIndex}
      />
    </div>
  );
}

function PropertiesGridSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <Skeleton className="h-48 w-full" />
          <CardContent className="p-4 space-y-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default async function PropertiesPage({ searchParams }: PageProps) {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
          <p className="text-muted-foreground">
            Browse property listings from Property Quest Turkey
          </p>
        </div>
      </div>

      {/* Filters */}
      <PropertyFilters />

      {/* Properties Grid */}
      <Suspense fallback={<PropertiesGridSkeleton />}>
        <PropertiesGrid searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
