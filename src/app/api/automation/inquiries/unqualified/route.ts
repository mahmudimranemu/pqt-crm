import prisma from "@/lib/prisma";
import { qualifierStartDate } from "@/lib/qualifier/config";
import { findPossibleDuplicates } from "@/lib/qualifier/data";
import { automationRoute, fail } from "@/lib/qualifier/route";

export const dynamic = "force-dynamic";

/**
 * GET /api/automation/inquiries/unqualified?limit=20
 * Meta / website enquiries with no qualification yet, created on or after
 * QUALIFIER_START_DATE (older ones are never processed). Oldest first.
 * No internal notes are returned.
 */
export const GET = automationRoute(async ({ url }) => {
  const start = qualifierStartDate();
  if (!start) return fail(503, "NOT_CONFIGURED", "QUALIFIER_START_DATE is not set");

  const limitRaw = Number(url.searchParams.get("limit") ?? 20);
  const limit = Number.isInteger(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 20;

  const done = await prisma.inquiryQualification.findMany({
    where: { enquiryCreatedAt: { gte: start } },
    select: { enquiryId: true },
  });

  const enquiries = await prisma.enquiry.findMany({
    where: {
      createdAt: { gte: start },
      source: { in: ["FACEBOOK_ADS", "WEBSITE_FORM"] },
      id: { notIn: done.map((d) => d.enquiryId) },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: {
      id: true,
      refId: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      message: true,
      budget: true,
      country: true,
      source: true,
      sourceUrl: true,
      status: true,
      assignedAgentId: true,
      createdAt: true,
    },
  });

  const dups = await findPossibleDuplicates(enquiries);

  return {
    status: 200,
    body: {
      startDate: start.toISOString(),
      count: enquiries.length,
      inquiries: enquiries.map((e) => ({ ...e, possibleDuplicates: dups.get(e.id) ?? [] })),
    },
    audit: { summary: { returned: enquiries.length } },
  };
});
