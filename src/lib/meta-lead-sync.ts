import prisma from "@/lib/prisma";
import { generateRefId } from "@/lib/ref-id";
import { notifySuperAdmins } from "@/lib/notifications";
import { mapLeadFieldData, type MetaLead } from "@/lib/api/meta-leads";

const TAG = "[meta-leads]";

/**
 * Create a CRM Enquiry from a Meta lead, or skip it if we've already ingested
 * that leadgen_id. Shared by the live webhook and the one-time backfill so both
 * map/dedup/create identically. Idempotent: the leadgen_id (stored in
 * `sourceUrl` as `meta:leadgen:<id>`) is the key.
 */
export async function syncMetaLeadToEnquiry(
  lead: MetaLead,
  formId?: string,
  opts: { notify?: boolean } = {},
): Promise<"created" | "skipped"> {
  const leadgenId = lead.id;

  const existing = await prisma.enquiry.findFirst({
    where: { sourceUrl: { contains: `meta:leadgen:${leadgenId}` } },
    select: { id: true },
  });
  if (existing) return "skipped";

  const m = mapLeadFieldData(lead);
  if (!m.email && !m.phone) {
    console.error(TAG, "lead has no email/phone; skipping", { leadgen_id: leadgenId });
    return "skipped";
  }

  const refId = await generateRefId();
  const enquiry = await prisma.enquiry.create({
    data: {
      refId,
      firstName: m.firstName || "-",
      lastName: m.lastName || "-",
      email: m.email || "-",
      phone: m.phone || "-",
      message: m.message,
      budget: m.budget,
      country: m.country,
      source: "FACEBOOK_ADS",
      sourceUrl: `meta:leadgen:${leadgenId}${formId ? ` | form:${formId}` : ""}`,
      status: "NEW",
      segment: "Buyer",
      priority: "Medium",
      nextCallDate: new Date(),
    },
  });
  console.log(TAG, "enquiry created", { id: enquiry.id, leadgen_id: leadgenId });

  if (opts.notify !== false) {
    await notifySuperAdmins(
      "SYSTEM_ALERT",
      "New Facebook lead",
      `${m.firstName} ${m.lastName}`.trim() + (m.email ? ` · ${m.email}` : ""),
      `/clients/enquiries/${enquiry.id}`,
    ).catch((e) => console.error(TAG, "notify failed", e));
  }
  return "created";
}
