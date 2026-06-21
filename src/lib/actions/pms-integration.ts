"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { auth, type ExtendedSession } from "@/lib/auth";
import { auditLog } from "@/lib/audit";
import { encryptSecret, maskApiKey, decryptSecret } from "@/lib/crypto";

async function requireAdmin() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN") {
    throw new Error("Unauthorized - Admin access required");
  }
  return session;
}

export async function getPmsIntegration() {
  await requireAdmin();
  const row = await prisma.pMSIntegration.findFirst();
  return {
    baseUrl: row?.baseUrl ?? "",
    hasKey: Boolean(row?.apiKeyEncrypted),
    keyHint: row?.apiKeyHint ?? null,
    isEnabled: row?.isEnabled ?? false,
    lastCheckedAt: row?.lastCheckedAt?.toISOString() ?? null,
  };
}

export async function upsertPmsIntegration(input: {
  baseUrl: string;
  apiKey?: string;
  isEnabled: boolean;
}) {
  await requireAdmin();
  const baseUrl = input.baseUrl.trim().replace(/\/+$/, "");
  if (baseUrl && !/^https?:\/\//i.test(baseUrl)) {
    throw new Error("Base URL must start with http:// or https://");
  }

  const key = input.apiKey?.trim();
  const existing = await prisma.pMSIntegration.findFirst();

  if (input.isEnabled && (!baseUrl || (!key && !existing?.apiKeyEncrypted))) {
    throw new Error("Add a base URL and API key before enabling.");
  }

  const data: {
    baseUrl: string;
    isEnabled: boolean;
    apiKeyEncrypted?: string;
    apiKeyHint?: string;
  } = { baseUrl, isEnabled: input.isEnabled };
  if (key) {
    data.apiKeyEncrypted = encryptSecret(key);
    data.apiKeyHint = maskApiKey(key);
  }

  const row = existing
    ? await prisma.pMSIntegration.update({ where: { id: existing.id }, data })
    : await prisma.pMSIntegration.create({ data });

  await auditLog("UPDATE", "PMSIntegration", row.id, {
    baseUrl,
    keyChanged: Boolean(key),
    isEnabled: input.isEnabled,
  });
  revalidatePath("/settings/pms");
  revalidatePath("/properties");
  return { ok: true };
}

/** Hit the PMS external API with the saved config to confirm it works. */
export async function testPmsConnection(): Promise<
  { ok: true; count: number } | { ok: false; error: string }
> {
  await requireAdmin();
  const row = await prisma.pMSIntegration.findFirst();
  if (!row?.baseUrl || !row.apiKeyEncrypted) {
    return { ok: false, error: "Set a base URL and API key first." };
  }
  try {
    const base = row.baseUrl.replace(/\/+$/, "");
    const key = decryptSecret(row.apiKeyEncrypted);
    const res = await fetch(`${base}/external/properties?limit=1`, {
      headers: { "X-API-Key": key },
      cache: "no-store",
    });
    if (!res.ok) {
      return { ok: false, error: `PMS returned ${res.status}: ${await res.text()}`.slice(0, 300) };
    }
    const data = await res.json();
    const count = Array.isArray(data?.items) ? data.items.length : 0;
    await prisma.pMSIntegration.update({
      where: { id: row.id },
      data: { lastCheckedAt: new Date() },
    });
    revalidatePath("/settings/pms");
    return { ok: true, count };
  } catch (e) {
    return { ok: false, error: (e instanceof Error ? e.message : String(e)).slice(0, 300) };
  }
}
