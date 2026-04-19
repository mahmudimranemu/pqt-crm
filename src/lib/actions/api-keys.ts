"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { auth, type ExtendedSession } from "@/lib/auth";
import { auditLog } from "@/lib/audit";
import {
  API_SCOPES,
  generateApiKey,
  type ApiScope,
} from "@/lib/api/auth";

async function requireSuperAdmin() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role !== "SUPER_ADMIN") {
    throw new Error("Unauthorized - Super Admin access required");
  }
  return session;
}

export async function listApiKeys() {
  await requireSuperAdmin();
  const rows = await prisma.apiKey.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { firstName: true, lastName: true, email: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    keyPrefix: r.keyPrefix,
    scopes: r.scopes,
    isActive: r.isActive,
    lastUsedAt: r.lastUsedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    createdBy: `${r.createdBy.firstName} ${r.createdBy.lastName}`,
  }));
}

export async function createApiKey(input: { name: string; scopes: string[] }) {
  const session = await requireSuperAdmin();

  const name = input.name.trim();
  if (!name) throw new Error("Name is required");

  const scopes = Array.from(new Set(input.scopes)).filter((s): s is ApiScope =>
    (API_SCOPES as readonly string[]).includes(s),
  );
  if (scopes.length === 0) throw new Error("At least one scope is required");

  const { raw, hash, prefix } = generateApiKey();

  const row = await prisma.apiKey.create({
    data: {
      name,
      keyHash: hash,
      keyPrefix: prefix,
      scopes,
      createdById: session.user.id,
    },
  });

  await auditLog("CREATE", "ApiKey", row.id, { name, scopes });

  revalidatePath("/settings/integrations");
  // raw is only ever returned here, never stored
  return { id: row.id, key: raw, prefix };
}

export async function setApiKeyActive(id: string, isActive: boolean) {
  await requireSuperAdmin();
  const row = await prisma.apiKey.update({
    where: { id },
    data: { isActive },
  });
  await auditLog("UPDATE", "ApiKey", row.id, { isActive });
  revalidatePath("/settings/integrations");
  return { ok: true };
}

export async function deleteApiKey(id: string) {
  await requireSuperAdmin();
  await prisma.apiKey.delete({ where: { id } });
  await auditLog("DELETE", "ApiKey", id, null);
  revalidatePath("/settings/integrations");
  return { ok: true };
}
