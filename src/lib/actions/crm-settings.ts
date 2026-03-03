"use server";

import prisma from "@/lib/prisma";
import { auth, type ExtendedSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// Ensures the 3 default pools exist in the DB (idempotent)
async function ensureDefaultPools() {
  const defaults = [
    { name: "Pool 1", tag: "POOL_1" },
    { name: "Pool 2", tag: "POOL_2" },
    { name: "Pool 3", tag: "POOL_3" },
  ];
  for (const p of defaults) {
    await prisma.pool.upsert({
      where: { tag: p.tag },
      update: {},
      create: { name: p.name, tag: p.tag, isActive: true },
    });
  }
}

// Helper to check SUPER_ADMIN
async function requireSuperAdmin() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role !== "SUPER_ADMIN") throw new Error("Unauthorized");
  return session;
}

export async function getPools() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  await ensureDefaultPools();

  return prisma.pool.findMany({
    orderBy: { createdAt: "asc" },
  });
}

export async function getPoolsForUser(userId: string) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  await ensureDefaultPools();

  // SUPER_ADMIN and ADMIN always see all active pools
  const role = session.user.role;
  if (role === "SUPER_ADMIN" || role === "ADMIN") {
    return prisma.pool.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
      select: { tag: true, name: true },
    });
  }

  // For others, filter by allowedUserIds (empty = everyone allowed)
  const pools = await prisma.pool.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    select: { tag: true, name: true, allowedUserIds: true },
  });

  return pools
    .filter(
      (p) => p.allowedUserIds.length === 0 || p.allowedUserIds.includes(userId),
    )
    .map(({ tag, name }) => ({ tag, name }));
}

export async function createPool(name: string) {
  await requireSuperAdmin();

  if (!name.trim()) throw new Error("Pool name is required");

  // Generate a unique tag from the name
  const base = name.trim().toUpperCase().replace(/\s+/g, "_").replace(/[^A-Z0-9_]/g, "");
  let tag = `POOL_${base}`;

  // Check uniqueness, append a number if taken
  const existing = await prisma.pool.findUnique({ where: { tag } });
  if (existing) {
    const count = await prisma.pool.count();
    tag = `${tag}_${count + 1}`;
  }

  const pool = await prisma.pool.create({
    data: { name: name.trim(), tag, isActive: true },
  });

  revalidatePath("/settings/crm");
  revalidatePath("/settings/users");
  return pool;
}

export async function updatePoolName(poolId: string, name: string) {
  await requireSuperAdmin();

  if (!name.trim()) throw new Error("Pool name is required");

  await prisma.pool.update({
    where: { id: poolId },
    data: { name: name.trim() },
  });

  revalidatePath("/settings/crm");
}

export async function togglePoolActive(poolId: string) {
  await requireSuperAdmin();

  const pool = await prisma.pool.findUnique({ where: { id: poolId } });
  if (!pool) throw new Error("Pool not found");

  await prisma.pool.update({
    where: { id: poolId },
    data: { isActive: !pool.isActive },
  });

  revalidatePath("/settings/crm");
  revalidatePath("/settings/users");
}

export async function deletePool(poolId: string) {
  await requireSuperAdmin();

  const pool = await prisma.pool.findUnique({ where: { id: poolId } });
  if (!pool) throw new Error("Pool not found");

  // Remove the pool tag from all enquiries and leads
  const enquiries = await prisma.enquiry.findMany({
    where: { tags: { has: pool.tag } },
    select: { id: true, tags: true },
  });
  for (const e of enquiries) {
    await prisma.enquiry.update({
      where: { id: e.id },
      data: { tags: e.tags.filter((t) => t !== pool.tag) },
    });
  }

  const leads = await prisma.lead.findMany({
    where: { tags: { has: pool.tag } },
    select: { id: true, tags: true },
  });
  for (const l of leads) {
    await prisma.lead.update({
      where: { id: l.id },
      data: { tags: l.tags.filter((t) => t !== pool.tag) },
    });
  }

  await prisma.pool.delete({ where: { id: poolId } });

  revalidatePath("/settings/crm");
  revalidatePath("/settings/users");
}

export async function setPoolAccess(poolId: string, allowedUserIds: string[]) {
  await requireSuperAdmin();

  await prisma.pool.update({
    where: { id: poolId },
    data: { allowedUserIds },
  });

  revalidatePath("/settings/crm");
}

// Returns users for the access control selector
export async function getUsersForAccess() {
  await requireSuperAdmin();

  return prisma.user.findMany({
    where: { isActive: true, role: { notIn: ["VIEWER"] } },
    select: { id: true, firstName: true, lastName: true, role: true },
    orderBy: { firstName: "asc" },
  });
}
