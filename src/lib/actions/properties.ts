"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { auth, type ExtendedSession } from "@/lib/auth";
import { generatePQTNumber } from "@/lib/utils";
import type { District, PropertyType, PropertyStatus } from "@prisma/client";
import { auditLog } from "@/lib/audit";

export interface PropertyFormData {
  name: string;
  developer?: string;
  district: District;
  address?: string;
  propertyType: PropertyType;
  totalUnits?: number;
  availableUnits?: number;
  priceFrom: number;
  priceTo: number;
  sizeFrom?: number;
  sizeTo?: number;
  bedrooms?: string;
  amenities: string[];
  completionDate?: Date;
  status: PropertyStatus;
  description?: string;
  images: string[];
  floorPlans: string[];
  latitude?: number;
  longitude?: number;
}

export async function getProperties(params?: {
  search?: string;
  district?: District;
  propertyType?: PropertyType;
  status?: PropertyStatus;
  citizenshipEligible?: boolean;
  priceMin?: number;
  priceMax?: number;
  page?: number;
  limit?: number;
}) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const {
    search,
    district,
    propertyType,
    status,
    citizenshipEligible,
    priceMin,
    priceMax,
    page = 1,
    limit = 25,
  } = params || {};
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (district) where.district = district;
  if (propertyType) where.propertyType = propertyType;
  if (status) where.status = status;
  if (citizenshipEligible !== undefined)
    where.citizenshipEligible = citizenshipEligible;

  if (priceMin || priceMax) {
    where.priceFrom = {};
    if (priceMin) (where.priceFrom as Record<string, number>).gte = priceMin;
    if (priceMax) (where.priceFrom as Record<string, number>).lte = priceMax;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { pqtNumber: { contains: search, mode: "insensitive" } },
      { developer: { contains: search, mode: "insensitive" } },
    ];
  }

  const [properties, total] = await Promise.all([
    prisma.property.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.property.count({ where }),
  ]);

  return {
    properties,
    total,
    pages: Math.ceil(total / limit),
    currentPage: page,
  };
}

export async function getProperty(id: string) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  return prisma.property.findUnique({
    where: { id },
    include: {
      bookings: {
        include: {
          client: {
            select: { id: true, firstName: true, lastName: true },
          },
          agent: {
            select: { firstName: true, lastName: true },
          },
        },
        orderBy: { bookingDate: "desc" },
        take: 10,
      },
      sales: {
        include: {
          client: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function createProperty(data: PropertyFormData) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role === "VIEWER" || session.user.role === "SALES_AGENT") {
    throw new Error("Unauthorized");
  }

  // Generate PQT number
  const existingCount = await prisma.property.count({
    where: { district: data.district },
  });
  const pqtNumber = generatePQTNumber(data.district, existingCount);

  // Determine citizenship eligibility
  const citizenshipEligible =
    data.priceFrom >= 400000 || data.priceTo >= 400000;

  const property = await prisma.property.create({
    data: {
      ...data,
      pqtNumber,
      citizenshipEligible,
      priceFrom: data.priceFrom,
      priceTo: data.priceTo,
      sizeFrom: data.sizeFrom,
      sizeTo: data.sizeTo,
      latitude: data.latitude,
      longitude: data.longitude,
    },
  });

  await auditLog("CREATE", "Property", property.id, {
    title: data.name,
    location: data.district,
  });

  revalidatePath("/properties");
  return property;
}

export async function updateProperty(
  id: string,
  data: Partial<PropertyFormData>,
) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role === "VIEWER" || session.user.role === "SALES_AGENT") {
    throw new Error("Unauthorized");
  }

  // Recalculate citizenship eligibility if prices changed
  let citizenshipEligible: boolean | undefined;
  if (data.priceFrom !== undefined || data.priceTo !== undefined) {
    const current = await prisma.property.findUnique({
      where: { id },
      select: { priceFrom: true, priceTo: true },
    });
    if (current) {
      const priceFrom = data.priceFrom ?? Number(current.priceFrom);
      const priceTo = data.priceTo ?? Number(current.priceTo);
      citizenshipEligible = priceFrom >= 400000 || priceTo >= 400000;
    }
  }

  const property = await prisma.property.update({
    where: { id },
    data: {
      ...data,
      citizenshipEligible,
    },
  });

  await auditLog("UPDATE", "Property", id, data as Record<string, unknown>);

  revalidatePath(`/properties/${id}`);
  revalidatePath("/properties");
  return property;
}

export async function deleteProperty(id: string) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  await prisma.property.delete({ where: { id } });

  await auditLog("DELETE", "Property", id);

  revalidatePath("/properties");
}

export async function getDistrictStats() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const stats = await prisma.property.groupBy({
    by: ["district"],
    _count: { id: true },
    _sum: { availableUnits: true },
    where: { status: "ACTIVE" },
  });

  return stats;
}
