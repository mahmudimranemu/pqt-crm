"use server";

import prisma from "@/lib/prisma";
import { auth, type ExtendedSession } from "@/lib/auth";

export type PoolItem = {
  id: string;
  type: "enquiry" | "lead";
  name: string;
  email: string;
  phone: string | null;
  status: string;
  createdAt: string;
  pool: string;
};

export type PoolGroup = {
  tag: string;
  name: string;
  items: PoolItem[];
};

async function getItemsForPool(poolTag: string): Promise<PoolItem[]> {
  const enquiries = await prisma.enquiry.findMany({
    where: { tags: { has: poolTag } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const leads = await prisma.lead.findMany({
    where: { tags: { has: poolTag } },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      client: { select: { firstName: true, lastName: true, email: true, phone: true } },
    },
  });

  const enquiryItems: PoolItem[] = enquiries.map((e) => ({
    id: e.id,
    type: "enquiry" as const,
    name: `${e.firstName} ${e.lastName}`,
    email: e.email,
    phone: e.phone,
    status: e.status,
    createdAt: e.createdAt.toISOString(),
    pool: poolTag,
  }));

  const leadItems: PoolItem[] = leads.map((l) => ({
    id: l.id,
    type: "lead" as const,
    name: l.client ? `${l.client.firstName} ${l.client.lastName}` : l.title,
    email: l.client?.email ?? "",
    phone: l.client?.phone ?? null,
    status: l.stage,
    createdAt: l.createdAt.toISOString(),
    pool: poolTag,
  }));

  return [...enquiryItems, ...leadItems];
}

export async function getPoolData(): Promise<PoolGroup[]> {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  // Fetch active pools from DB (dynamic)
  const pools = await prisma.pool.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    select: { tag: true, name: true },
  });

  // If no pools exist, fall back to defaults
  const activePools =
    pools.length > 0
      ? pools
      : [
          { tag: "POOL_1", name: "Pool 1" },
          { tag: "POOL_2", name: "Pool 2" },
          { tag: "POOL_3", name: "Pool 3" },
        ];

  const results = await Promise.all(
    activePools.map((p) => getItemsForPool(p.tag)),
  );

  return activePools.map((p, i) => ({
    tag: p.tag,
    name: p.name,
    items: results[i],
  }));
}
