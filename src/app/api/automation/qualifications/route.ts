import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { tierForScore } from "@/lib/qualifier/data";
import { qualificationInput } from "@/lib/qualifier/schemas";
import { automationRoute, fail, validate } from "@/lib/qualifier/route";

export const dynamic = "force-dynamic";

/**
 * POST /api/automation/qualifications
 * Saves the score + suggestion for one enquiry. Idempotent on enquiryId: a
 * second call returns the existing row (200, created:false) and changes
 * nothing. The enquiry's ref, source and arrival time are copied from the
 * CRM, never taken from the caller. The mode is the server's QUALIFIER_MODE.
 */
export const POST = automationRoute(async ({ body, mode }) => {
  const v = validate(qualificationInput, body);
  if (!v.ok) return v.result;
  const input = v.data;
  const audit = { enquiryId: input.enquiryId };

  const existing = await prisma.inquiryQualification.findUnique({ where: { enquiryId: input.enquiryId } });
  if (existing) {
    return { status: 200, body: { created: false, qualification: existing }, audit: { ...audit, summary: { created: false } } };
  }

  const enquiry = await prisma.enquiry.findUnique({
    where: { id: input.enquiryId },
    select: { id: true, refId: true, source: true, createdAt: true },
  });
  if (!enquiry) return { ...fail(404, "ENQUIRY_NOT_FOUND", "No enquiry with that id"), audit };

  const rules = await prisma.qualifierRules.findUnique({ where: { version: input.rulesVersion } });
  if (!rules) return { ...fail(422, "UNKNOWN_RULES_VERSION", `Rules version ${input.rulesVersion} does not exist`), audit };

  // The tier must follow from the score under that rules version — the
  // number comes from rules, so a mismatch means the caller is out of date.
  const expectedTier = tierForScore(rules.rules, input.score);
  if (expectedTier && expectedTier !== input.tier) {
    return {
      ...fail(422, "TIER_MISMATCH", `Score ${input.score} is "${expectedTier}" under rules v${input.rulesVersion}, not "${input.tier}"`),
      audit,
    };
  }

  const agentIds = [input.suggestedAgentId, input.backupAgentId].filter((x): x is string => !!x);
  if (agentIds.length) {
    const found = await prisma.user.count({ where: { id: { in: agentIds }, isActive: true } });
    if (found !== new Set(agentIds).size) {
      return { ...fail(422, "UNKNOWN_AGENT", "Suggested or backup agent is not an active user"), audit };
    }
  }

  try {
    const created = await prisma.inquiryQualification.create({
      data: {
        enquiryId: enquiry.id,
        enquiryRefId: enquiry.refId,
        enquirySource: enquiry.source,
        enquiryCreatedAt: enquiry.createdAt,
        score: input.score,
        tier: input.tier,
        scoreReasons: input.scoreReasons,
        extractedData: input.extractedData as Prisma.InputJsonValue | undefined,
        aiSummary: input.aiSummary ?? null,
        isDuplicate: input.isDuplicate,
        duplicateOf: input.duplicateOf ?? null,
        suggestedAgentId: input.suggestedAgentId ?? null,
        backupAgentId: input.backupAgentId ?? null,
        suggestionReasons: input.suggestionReasons,
        suggestionScoreBreakdown: input.suggestionScoreBreakdown as Prisma.InputJsonValue | undefined,
        mode,
        rulesVersion: input.rulesVersion,
      },
    });
    return {
      status: 201,
      body: { created: true, qualification: created },
      audit: { ...audit, summary: { created: true, score: created.score, tier: created.tier } },
    };
  } catch (e) {
    // Two calls raced past the findUnique — the unique index kept one row.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const row = await prisma.inquiryQualification.findUnique({ where: { enquiryId: input.enquiryId } });
      return { status: 200, body: { created: false, qualification: row }, audit: { ...audit, summary: { created: false, race: true } } };
    }
    throw e;
  }
});
