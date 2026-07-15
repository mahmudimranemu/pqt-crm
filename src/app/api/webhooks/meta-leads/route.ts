import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { notifySuperAdmins } from "@/lib/notifications";
import { generateRefId } from "@/lib/ref-id";
import { fetchMetaLead, mapLeadFieldData } from "@/lib/api/meta-leads";

/**
 * Inbound webhook for Meta (Facebook / Instagram) Lead Ads.
 *
 * Setup + how to connect a lead form: see META_LEADS_WEBHOOK.md.
 *
 *   GET  — Meta's subscription handshake: echo `hub.challenge` when
 *          `hub.verify_token` matches META_VERIFY_TOKEN.
 *   POST — a `leadgen` change. Verified via `X-Hub-Signature-256` (HMAC-SHA256
 *          of the raw body with META_APP_SECRET). The payload has no field data,
 *          so we pull the lead from the Graph API and create a CRM Enquiry.
 *
 * Feature flags (mirrors the users webhook):
 *   WEBHOOK_META_LEADS_ENABLED=true        → route reachable (404s otherwise)
 *   WEBHOOK_META_LEADS_WRITE_ENABLED=true  → persists (log-only otherwise)
 *
 * Env: META_VERIFY_TOKEN, META_APP_SECRET, META_PAGE_ACCESS_TOKEN,
 *      META_GRAPH_API_VERSION (optional).
 */

const TAG = "[meta-leads webhook]";

function enabled(): boolean {
  return process.env.WEBHOOK_META_LEADS_ENABLED === "true";
}

function constantTimeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

// GET — Meta verification handshake.
export async function GET(request: NextRequest) {
  if (!enabled()) return new NextResponse("Not Found", { status: 404 });

  const sp = request.nextUrl.searchParams;
  const mode = sp.get("hub.mode");
  const token = sp.get("hub.verify_token");
  const challenge = sp.get("hub.challenge") ?? "";
  const expected = process.env.META_VERIFY_TOKEN;

  if (mode === "subscribe" && expected && token === expected) {
    // Meta expects the raw challenge string echoed back.
    return new NextResponse(challenge, {
      status: 200,
      headers: { "content-type": "text/plain" },
    });
  }
  return new NextResponse("verification failed", { status: 403 });
}

type LeadgenValue = {
  leadgen_id?: string;
  form_id?: string;
  page_id?: string;
  ad_id?: string;
  created_time?: number;
};
type Entry = { id?: string; time?: number; changes?: { field?: string; value?: LeadgenValue }[] };
type Payload = { object?: string; entry?: Entry[] };

// POST — a leadgen notification.
export async function POST(request: NextRequest) {
  if (!enabled()) return new NextResponse("Not Found", { status: 404 });

  const secret = process.env.META_APP_SECRET;
  if (!secret) {
    console.error(TAG, "META_APP_SECRET unset");
    return new NextResponse("server misconfigured", { status: 500 });
  }

  const raw = await request.text();
  const sig = request.headers.get("x-hub-signature-256") ?? "";
  const expected =
    "sha256=" + crypto.createHmac("sha256", secret).update(raw).digest("hex");
  if (!sig || !constantTimeEqual(sig, expected)) {
    console.error(TAG, "bad signature");
    return new NextResponse("bad signature", { status: 401 });
  }

  let body: Payload;
  try {
    body = JSON.parse(raw);
  } catch {
    return new NextResponse("invalid json", { status: 400 });
  }

  // Only page leadgen events. Anything else is acknowledged so Meta stops retrying.
  if (body.object !== "page") {
    return NextResponse.json({ received: true, ignored: body.object ?? null });
  }

  const writeEnabled = process.env.WEBHOOK_META_LEADS_WRITE_ENABLED === "true";
  const leads: LeadgenValue[] = [];
  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field === "leadgen" && change.value?.leadgen_id) {
        leads.push(change.value);
      }
    }
  }

  let created = 0;
  let skipped = 0;
  for (const v of leads) {
    const leadgenId = v.leadgen_id as string;
    try {
      // Dedup — Meta retries deliveries; the leadgen_id is our idempotency key.
      const existing = await prisma.enquiry.findFirst({
        where: { sourceUrl: { contains: `meta:leadgen:${leadgenId}` } },
        select: { id: true },
      });
      if (existing) {
        skipped++;
        continue;
      }

      if (!writeEnabled) {
        console.log(TAG, "log-only", { leadgen_id: leadgenId, form_id: v.form_id });
        continue;
      }

      const lead = await fetchMetaLead(leadgenId);
      const m = mapLeadFieldData(lead);
      if (!m.email && !m.phone) {
        console.error(TAG, "lead has no email/phone; skipping", { leadgen_id: leadgenId });
        skipped++;
        continue;
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
          sourceUrl: `meta:leadgen:${leadgenId}${v.form_id ? ` | form:${v.form_id}` : ""}`,
          status: "NEW",
          segment: "Buyer",
          priority: "Medium",
          nextCallDate: new Date(),
        },
      });
      created++;
      console.log(TAG, "enquiry created", { id: enquiry.id, leadgen_id: leadgenId });

      await notifySuperAdmins(
        "SYSTEM_ALERT",
        "New Facebook lead",
        `${m.firstName} ${m.lastName}`.trim() + (m.email ? ` · ${m.email}` : ""),
        `/clients/enquiries/${enquiry.id}`,
      ).catch((e) => console.error(TAG, "notify failed", e));
    } catch (err) {
      // Log and move on — return 200 regardless so Meta doesn't disable the
      // endpoint. Un-created leads can be re-pulled from Meta if needed.
      console.error(TAG, "lead processing failed", { leadgen_id: leadgenId, err });
      skipped++;
    }
  }

  return NextResponse.json({ received: true, created, skipped });
}
