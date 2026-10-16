import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

/**
 * Append a row to qualifier_audit. Never throws — a failed audit write must
 * not break the request it describes. `summary` must hold counts / ids /
 * labels only: never phone numbers, emails, names or client notes.
 */
export async function qualifierAudit(entry: {
  actor: string;
  action: string;
  outcome: "ok" | "error" | "rejected";
  enquiryId?: string | null;
  summary?: Prisma.InputJsonValue;
  errorMessage?: string | null;
}): Promise<void> {
  try {
    await prisma.qualifierAudit.create({
      data: {
        actor: entry.actor,
        action: entry.action,
        outcome: entry.outcome,
        enquiryId: entry.enquiryId ?? null,
        summary: entry.summary,
        errorMessage: entry.errorMessage?.slice(0, 500) ?? null,
      },
    });
  } catch (e) {
    console.error("[qualifier] audit write failed", e instanceof Error ? e.message : e);
  }
}
