"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { auth, type ExtendedSession } from "@/lib/auth";
import type {
  BookingStatus,
  BookingOutcome,
  BookingType,
} from "@prisma/client";

export interface BookingFormData {
  clientId: string;
  propertyId: string;
  agentId: string;
  bookingDate: Date;
  bookingType: BookingType;
  status: BookingStatus;
  notes?: string;
}

// Get all bookings for calendar
export async function getBookingsForCalendar(start: Date, end: Date) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const where: Record<string, unknown> = {
    bookingDate: {
      gte: start,
      lte: end,
    },
  };

  // Role-based filtering
  if (session.user.role === "SALES_AGENT") {
    where.agentId = session.user.id;
  } else if (session.user.role !== "SUPER_ADMIN") {
    const officeAgents = await prisma.user.findMany({
      where: { office: session.user.office },
      select: { id: true },
    });
    where.agentId = { in: officeAgents.map((a) => a.id) };
  }

  return prisma.booking.findMany({
    where,
    include: {
      client: { select: { id: true, firstName: true, lastName: true } },
      property: { select: { id: true, name: true, pqtNumber: true } },
      agent: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { bookingDate: "asc" },
  });
}

// Get future bookings
export async function getFutureBookings(params?: {
  agentId?: string;
  page?: number;
  limit?: number;
}) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const { agentId, page = 1, limit = 25 } = params || {};
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {
    bookingDate: { gt: new Date() },
  };

  if (session.user.role === "SALES_AGENT") {
    where.agentId = session.user.id;
  } else if (session.user.role !== "SUPER_ADMIN") {
    const officeAgents = await prisma.user.findMany({
      where: { office: session.user.office },
      select: { id: true },
    });
    where.agentId = { in: officeAgents.map((a) => a.id) };
  }

  if (agentId) where.agentId = agentId;

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: {
        client: { select: { id: true, firstName: true, lastName: true } },
        property: {
          select: { id: true, name: true, pqtNumber: true, district: true },
        },
        agent: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { bookingDate: "asc" },
      skip,
      take: limit,
    }),
    prisma.booking.count({ where }),
  ]);

  return {
    bookings,
    total,
    pages: Math.ceil(total / limit),
    currentPage: page,
  };
}

// Get no-sales bookings
export async function getNoSalesBookings(params?: {
  page?: number;
  limit?: number;
}) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const { page = 1, limit = 25 } = params || {};
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {
    outcome: "NOT_INTERESTED",
  };

  if (session.user.role === "SALES_AGENT") {
    where.agentId = session.user.id;
  } else if (session.user.role !== "SUPER_ADMIN") {
    const officeAgents = await prisma.user.findMany({
      where: { office: session.user.office },
      select: { id: true },
    });
    where.agentId = { in: officeAgents.map((a) => a.id) };
  }

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: {
        client: { select: { id: true, firstName: true, lastName: true } },
        property: { select: { id: true, name: true, pqtNumber: true } },
        agent: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { bookingDate: "desc" },
      skip,
      take: limit,
    }),
    prisma.booking.count({ where }),
  ]);

  return {
    bookings,
    total,
    pages: Math.ceil(total / limit),
    currentPage: page,
  };
}

// Get sales bookings
export async function getSalesBookings(params?: {
  page?: number;
  limit?: number;
}) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const { page = 1, limit = 25 } = params || {};
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {
    outcome: "SOLD",
  };

  if (session.user.role === "SALES_AGENT") {
    where.agentId = session.user.id;
  } else if (session.user.role !== "SUPER_ADMIN") {
    const officeAgents = await prisma.user.findMany({
      where: { office: session.user.office },
      select: { id: true },
    });
    where.agentId = { in: officeAgents.map((a) => a.id) };
  }

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: {
        client: { select: { id: true, firstName: true, lastName: true } },
        property: { select: { id: true, name: true, pqtNumber: true } },
        agent: { select: { id: true, firstName: true, lastName: true } },
        sale: true,
      },
      orderBy: { bookingDate: "desc" },
      skip,
      take: limit,
    }),
    prisma.booking.count({ where }),
  ]);

  return {
    bookings,
    total,
    pages: Math.ceil(total / limit),
    currentPage: page,
  };
}

// Get pending bookings
export async function getPendingBookings(params?: {
  page?: number;
  limit?: number;
}) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const { page = 1, limit = 25 } = params || {};
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {
    status: { in: ["SCHEDULED", "CONFIRMED"] },
    outcome: null,
  };

  if (session.user.role === "SALES_AGENT") {
    where.agentId = session.user.id;
  } else if (session.user.role !== "SUPER_ADMIN") {
    const officeAgents = await prisma.user.findMany({
      where: { office: session.user.office },
      select: { id: true },
    });
    where.agentId = { in: officeAgents.map((a) => a.id) };
  }

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: {
        client: { select: { id: true, firstName: true, lastName: true } },
        property: { select: { id: true, name: true, pqtNumber: true } },
        agent: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { bookingDate: "asc" },
      skip,
      take: limit,
    }),
    prisma.booking.count({ where }),
  ]);

  return {
    bookings,
    total,
    pages: Math.ceil(total / limit),
    currentPage: page,
  };
}

// Get need-to-close bookings (offers made)
export async function getNeedToCloseBookings(params?: {
  page?: number;
  limit?: number;
}) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const { page = 1, limit = 25 } = params || {};
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {
    outcome: "OFFER_MADE",
  };

  if (session.user.role === "SALES_AGENT") {
    where.agentId = session.user.id;
  } else if (session.user.role !== "SUPER_ADMIN") {
    const officeAgents = await prisma.user.findMany({
      where: { office: session.user.office },
      select: { id: true },
    });
    where.agentId = { in: officeAgents.map((a) => a.id) };
  }

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        },
        property: { select: { id: true, name: true, pqtNumber: true } },
        agent: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { updatedAt: "asc" },
      skip,
      take: limit,
    }),
    prisma.booking.count({ where }),
  ]);

  return {
    bookings,
    total,
    pages: Math.ceil(total / limit),
    currentPage: page,
  };
}

// Get booking stats
export async function getBookingStats() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const baseWhere: Record<string, unknown> = {};

  if (session.user.role === "SALES_AGENT") {
    baseWhere.agentId = session.user.id;
  } else if (session.user.role !== "SUPER_ADMIN") {
    const officeAgents = await prisma.user.findMany({
      where: { office: session.user.office },
      select: { id: true },
    });
    baseWhere.agentId = { in: officeAgents.map((a) => a.id) };
  }

  const [
    totalBookings,
    thisMonthBookings,
    lastMonthBookings,
    completedBookings,
    soldBookings,
    byDistrict,
  ] = await Promise.all([
    prisma.booking.count({ where: baseWhere }),
    prisma.booking.count({
      where: { ...baseWhere, bookingDate: { gte: thisMonthStart } },
    }),
    prisma.booking.count({
      where: {
        ...baseWhere,
        bookingDate: { gte: lastMonthStart, lte: lastMonthEnd },
      },
    }),
    prisma.booking.count({
      where: { ...baseWhere, status: "COMPLETED" },
    }),
    prisma.booking.count({
      where: { ...baseWhere, outcome: "SOLD" },
    }),
    prisma.booking.groupBy({
      by: ["propertyId"],
      where: baseWhere,
      _count: { id: true },
    }),
  ]);

  const conversionRate =
    completedBookings > 0 ? (soldBookings / completedBookings) * 100 : 0;

  return {
    totalBookings,
    thisMonthBookings,
    lastMonthBookings,
    completedBookings,
    soldBookings,
    conversionRate,
  };
}

// Create booking
export async function createBooking(data: BookingFormData) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role === "VIEWER") throw new Error("Unauthorized");

  const booking = await prisma.booking.create({
    data: {
      ...data,
      agentId: data.agentId || session.user.id,
    },
  });

  revalidatePath("/bookings");
  revalidatePath("/bookings/calendar");
  revalidatePath("/bookings/future");
  return booking;
}

// Update booking
export async function updateBooking(
  id: string,
  data: Partial<
    BookingFormData & { outcome?: BookingOutcome; noSaleReason?: string }
  >,
) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role === "VIEWER") throw new Error("Unauthorized");

  const booking = await prisma.booking.update({
    where: { id },
    data,
  });

  revalidatePath("/bookings");
  return booking;
}

// Update booking status
export async function updateBookingStatus(id: string, status: BookingStatus) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role === "VIEWER") throw new Error("Unauthorized");

  const booking = await prisma.booking.update({
    where: { id },
    data: { status },
  });

  revalidatePath("/bookings");
  return booking;
}

// Update booking outcome
export async function updateBookingOutcome(
  id: string,
  outcome: BookingOutcome,
  noSaleReason?: string,
) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role === "VIEWER") throw new Error("Unauthorized");

  const booking = await prisma.booking.update({
    where: { id },
    data: {
      outcome,
      noSaleReason: outcome === "NOT_INTERESTED" ? noSaleReason : null,
      status: "COMPLETED",
    },
  });

  revalidatePath("/bookings");
  return booking;
}

// Get clients and properties for booking form
export async function getBookingFormData() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const clientWhere: Record<string, unknown> = {};

  if (session.user.role === "SALES_AGENT") {
    clientWhere.assignedAgentId = session.user.id;
  } else if (session.user.role !== "SUPER_ADMIN") {
    const officeAgents = await prisma.user.findMany({
      where: { office: session.user.office },
      select: { id: true },
    });
    clientWhere.assignedAgentId = { in: officeAgents.map((a) => a.id) };
  }

  const [clients, properties, agents] = await Promise.all([
    prisma.client.findMany({
      where: clientWhere,
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    }),
    prisma.property.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, pqtNumber: true, district: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: {
        isActive: true,
        role: { in: ["SALES_AGENT", "SALES_MANAGER"] },
        ...(session.user.role !== "SUPER_ADMIN"
          ? { office: session.user.office }
          : {}),
      },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    }),
  ]);

  return { clients, properties, agents };
}

export async function deleteBooking(id: string) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role !== "SUPER_ADMIN")
    throw new Error("Unauthorized: Only SUPER_ADMIN can delete bookings");

  await prisma.booking.delete({
    where: { id },
  });

  revalidatePath("/bookings");
}

export async function bulkDeleteBookings(ids: string[]) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role !== "SUPER_ADMIN")
    throw new Error("Unauthorized: Only SUPER_ADMIN can bulk delete");

  await prisma.booking.deleteMany({
    where: { id: { in: ids } },
  });

  revalidatePath("/bookings");
}
