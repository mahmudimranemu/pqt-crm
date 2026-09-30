"use server";

import prisma from "@/lib/prisma";
import { auth, type ExtendedSession } from "@/lib/auth";
import { runLeadAnalysis, type LeadAnalysisRun } from "@/lib/ai/run-lead-analysis";

/**
 * Server actions for the lead Analysis button. Who may run it follows the
 * lead page itself: Super Admin, or the lead's owner (approved default for
 * the spec's view_own / view_all).
 */

async function requireLeadAccess(leadId: string) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { ownerId: true },
  });
  if (!lead) throw new Error("Lead not found");
  if (session.user.role !== "SUPER_ADMIN" && lead.ownerId !== session.user.id) {
    throw new Error("You don't have access to this lead.");
  }
  return session;
}

export async function analyseLead(leadId: string): Promise<LeadAnalysisRun> {
  try {
    const session = await requireLeadAccess(leadId);
    return await runLeadAnalysis({ leadId, requestedById: session.user.id });
  } catch (e) {
    console.error("analyseLead failed:", e);
    return {
      ok: false,
      error: e instanceof Error ? e.message.slice(0, 400) : "Analysis failed.",
      analysisId: null,
    };
  }
}
