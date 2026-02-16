"use server";

import prisma from "@/lib/prisma";
import { auth, type ExtendedSession } from "@/lib/auth";

export type SearchResult = {
  id: string;
  title: string;
  subtitle: string;
  category: "client" | "lead" | "deal" | "property" | "enquiry";
  href: string;
};

export async function globalSearch(query: string): Promise<SearchResult[]> {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  if (!query || query.trim().length < 2) return [];

  const q = query.trim();
  const results: SearchResult[] = [];

  // Search Clients
  const clients = await prisma.client.findMany({
    where: {
      OR: [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, firstName: true, lastName: true, email: true },
    take: 5,
  });
  results.push(
    ...clients.map((c) => ({
      id: c.id,
      title: `${c.firstName} ${c.lastName}`,
      subtitle: c.email,
      category: "client" as const,
      href: `/clients/${c.id}`,
    })),
  );

  // Search Leads
  const leads = await prisma.lead.findMany({
    where: {
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { client: { firstName: { contains: q, mode: "insensitive" } } },
        { client: { lastName: { contains: q, mode: "insensitive" } } },
      ],
    },
    select: {
      id: true,
      title: true,
      stage: true,
      client: { select: { firstName: true, lastName: true } },
    },
    take: 5,
  });
  results.push(
    ...leads.map((l) => ({
      id: l.id,
      title: l.title,
      subtitle: `${l.client.firstName} ${l.client.lastName} - ${l.stage}`,
      category: "lead" as const,
      href: `/leads/${l.id}`,
    })),
  );

  // Search Deals
  const deals = await prisma.deal.findMany({
    where: {
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { client: { firstName: { contains: q, mode: "insensitive" } } },
        { client: { lastName: { contains: q, mode: "insensitive" } } },
      ],
    },
    select: {
      id: true,
      title: true,
      stage: true,
      client: { select: { firstName: true, lastName: true } },
    },
    take: 5,
  });
  results.push(
    ...deals.map((d) => ({
      id: d.id,
      title: d.title,
      subtitle: `${d.client.firstName} ${d.client.lastName} - ${d.stage}`,
      category: "deal" as const,
      href: `/deals/${d.id}`,
    })),
  );

  // Search Properties
  const properties = await prisma.property.findMany({
    where: {
      name: { contains: q, mode: "insensitive" },
    },
    select: { id: true, name: true, district: true, address: true },
    take: 5,
  });
  results.push(
    ...properties.map((p) => ({
      id: p.id,
      title: p.name,
      subtitle: `${p.district}${p.address ? `, ${p.address}` : ""}`,
      category: "property" as const,
      href: `/properties/${p.id}`,
    })),
  );

  // Search Enquiries
  const enquiries = await prisma.enquiry.findMany({
    where: {
      OR: [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      status: true,
    },
    take: 5,
  });
  results.push(
    ...enquiries.map((e) => ({
      id: e.id,
      title: `${e.firstName} ${e.lastName}`,
      subtitle: `${e.email} - ${e.status}`,
      category: "enquiry" as const,
      href: `/clients/enquiries/${e.id}`,
    })),
  );

  return results;
}
