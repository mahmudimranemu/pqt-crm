import "server-only";

import prisma from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";

export type PmsConfig = {
  baseUrl: string;
  apiKey: string;
  isEnabled: boolean;
};

/**
 * The decrypted PMS connection config, or null when not usable (disabled, no
 * base URL, or no key). Server-only — never expose the decrypted key to the
 * client. Used by the property fetcher to pull from the PMS external API.
 */
export async function getPmsConfig(): Promise<PmsConfig | null> {
  const row = await prisma.pMSIntegration.findFirst();
  if (!row || !row.isEnabled || !row.baseUrl || !row.apiKeyEncrypted) return null;
  try {
    return {
      baseUrl: row.baseUrl.replace(/\/+$/, ""),
      apiKey: decryptSecret(row.apiKeyEncrypted),
      isEnabled: row.isEnabled,
    };
  } catch {
    return null;
  }
}
