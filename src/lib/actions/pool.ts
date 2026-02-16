"use server";

import prisma from "@/lib/prisma";
import { auth, type ExtendedSession } from "@/lib/auth";

type PoolItem = {
  id: string;
  type: "enquiry" | "lead";
  name: string;
  email: string;
  phone: string | null;
  status: string;
  createdAt: string;
  pool: string;
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

export async function getPoolData() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const [pool1, pool2, pool3] = await Promise.all([
    getItemsForPool("POOL_1"),
    getItemsForPool("POOL_2"),
    getItemsForPool("POOL_3"),
  ]);

  return { pool1, pool2, pool3 };
}
