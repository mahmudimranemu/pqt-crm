import { NextRequest, NextResponse } from "next/server";
import { fetchFormLeads, fetchPageLeadForms } from "@/lib/api/meta-leads";
import { syncMetaLeadToEnquiry } from "@/lib/meta-lead-sync";

/**
 * One-time (re-runnable) backfill of historical Meta Lead Ads leads that were
 * submitted before the webhook was connected. Meta doesn't replay old leads to
 * the webhook, so we pull them from the Graph API and create enquiries via the
 * same shared helper (deduped by leadgen_id — safe to run repeatedly).
 *
 *   POST /api/webhooks/meta-leads/backfill?secret=<META_VERIFY_TOKEN>&page_id=<PAGE_ID>
 *   POST /api/webhooks/meta-leads/backfill?secret=<META_VERIFY_TOKEN>&form_id=<FORM_ID>
 *
 * Gated by WEBHOOK_META_LEADS_ENABLED + the META_VERIFY_TOKEN secret. See
 * META_LEADS_WEBHOOK.md.
 */

const TAG = "[meta-leads backfill]";

export async function POST(request: NextRequest) {
  if (process.env.WEBHOOK_META_LEADS_ENABLED !== "true") {
    return new NextResponse("Not Found", { status: 404 });
  }

  // Operator-only: shared secret must match META_VERIFY_TOKEN.
  const expected = process.env.META_VERIFY_TOKEN;
  const secret =
    request.nextUrl.searchParams.get("secret") ||
    request.headers.get("x-backfill-secret") ||
    "";
  if (!expected || secret !== expected) {
    return new NextResponse("unauthorized", { status: 401 });
  }

  const sp = request.nextUrl.searchParams;
  const formId = sp.get("form_id") || undefined;
  const pageId = sp.get("page_id") || process.env.META_PAGE_ID || undefined;

  try {
    let formIds: string[];
    if (formId) {
      formIds = [formId];
    } else if (pageId) {
      formIds = (await fetchPageLeadForms(pageId)).map((f) => f.id);
    } else {
      return NextResponse.json(
        { error: "Provide form_id, or page_id (or set META_PAGE_ID)." },
        { status: 400 },
      );
    }

    let created = 0;
    let skipped = 0;
    let leadsSeen = 0;
    for (const fid of formIds) {
      const leads = await fetchFormLeads(fid);
      leadsSeen += leads.length;
      for (const lead of leads) {
        try {
          // notify:false — 30 leads at once shouldn't spam super-admins.
          const result = await syncMetaLeadToEnquiry(lead, fid, { notify: false });
          if (result === "created") created++;
          else skipped++;
        } catch (err) {
          console.error(TAG, "lead failed", { leadgen_id: lead.id, err });
          skipped++;
        }
      }
    }

    console.log(TAG, "done", { forms: formIds.length, leads: leadsSeen, created, skipped });
    return NextResponse.json({
      ok: true,
      forms: formIds.length,
      leads: leadsSeen,
      created,
      skipped,
    });
  } catch (err) {
    console.error(TAG, "backfill failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "backfill failed" },
      { status: 500 },
    );
  }
}
