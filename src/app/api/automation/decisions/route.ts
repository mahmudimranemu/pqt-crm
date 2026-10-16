import prisma from "@/lib/prisma";
import { decisionInput } from "@/lib/qualifier/schemas";
import { automationRoute, fail, validate } from "@/lib/qualifier/route";

export const dynamic = "force-dynamic";

/**
 * POST /api/automation/decisions
 * Records the senior consultant's choice from a Telegram button.
 *
 * - The pressing chat must belong to an active senior consultant's profile.
 * - Pressing twice is harmless: the first decision stands (alreadyDecided).
 * - shadow mode: the choice is ONLY recorded; nothing is assigned.
 * - live mode: refused for now. Assigning must go through the CRM's existing
 *   assignEnquiry(), which needs a logged-in user; making it callable from
 *   here is a change to an existing file, saved for the go-live step.
 */
export const POST = automationRoute(async ({ body, mode }) => {
  const v = validate(decisionInput, body);
  if (!v.ok) return v.result;
  const input = v.data;
  const audit = { enquiryId: input.enquiryId };

  if (mode === "live") {
    return {
      ...fail(501, "LIVE_NOT_AVAILABLE", "Live assignment isn't switched on yet. Use QUALIFIER_MODE=shadow."),
      audit,
    };
  }

  const decider = await prisma.agentProfile.findUnique({
    where: { telegramChatId: input.telegramChatId },
    select: { isSeniorConsultant: true, user: { select: { id: true, isActive: true } } },
  });
  if (!decider || !decider.isSeniorConsultant || !decider.user.isActive) {
    return { ...fail(403, "NOT_A_SENIOR_CONSULTANT", "This Telegram chat isn't registered to a senior consultant"), audit };
  }

  const q = await prisma.inquiryQualification.findUnique({ where: { enquiryId: input.enquiryId } });
  if (!q) return { ...fail(404, "NOT_QUALIFIED", "No qualification for that enquiry"), audit };

  const chosen = await prisma.user.findFirst({
    where: { id: input.chosenAgentId, isActive: true },
    select: { id: true },
  });
  if (!chosen) return { ...fail(422, "UNKNOWN_AGENT", "Chosen agent is not an active user"), audit };

  if (q.decidedAt) {
    return { status: 200, body: { recorded: false, alreadyDecided: true, qualification: q }, audit: { ...audit, summary: { alreadyDecided: true } } };
  }

  const status = input.chosenAgentId === q.suggestedAgentId ? "approved" : "changed";
  // decidedAt: null in the WHERE makes a double press race-safe.
  const updated = await prisma.inquiryQualification.updateMany({
    where: { id: q.id, decidedAt: null },
    data: {
      finalAgentId: input.chosenAgentId,
      decidedByUserId: decider.user.id,
      decidedAt: new Date(),
      status,
    },
  });
  const row = await prisma.inquiryQualification.findUnique({ where: { id: q.id } });
  if (updated.count === 0) {
    return { status: 200, body: { recorded: false, alreadyDecided: true, qualification: row }, audit: { ...audit, summary: { alreadyDecided: true } } };
  }

  if (input.externalMessageId) {
    await prisma.qualifierNotification.updateMany({
      where: { externalMessageId: input.externalMessageId, responseAt: null },
      data: { responseAt: new Date() },
    });
  }

  // Shadow mode: report who (if anyone) the humans have assigned meanwhile,
  // so the comparison "AI suggested X / human chose Y" can be made later.
  const enquiry = await prisma.enquiry.findUnique({
    where: { id: input.enquiryId },
    select: { assignedAgentId: true },
  });

  return {
    status: 200,
    body: {
      recorded: true,
      assigned: false,
      mode,
      status,
      enquiryAssignedAgentId: enquiry?.assignedAgentId ?? null,
      enquiryStillExists: !!enquiry,
      qualification: row,
    },
    audit: { ...audit, summary: { recorded: true, status } },
  };
});
