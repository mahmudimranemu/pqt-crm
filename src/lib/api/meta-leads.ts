/**
 * Meta (Facebook) Lead Ads — Graph API helpers.
 *
 * A Lead Ads webhook only tells us a `leadgen_id`; the actual answers must be
 * pulled from the Graph API with a Page access token. See META_LEADS_WEBHOOK.md
 * for how to obtain the token / secret and wire the webhook.
 */

const GRAPH_VERSION = process.env.META_GRAPH_API_VERSION || "v21.0";

/** One answer from a Lead Ads form. `values` is usually a single-element array. */
export type MetaFieldDatum = { name: string; values: string[] };

export type MetaLead = {
  id: string;
  created_time?: string;
  ad_id?: string;
  ad_name?: string;
  form_id?: string;
  campaign_id?: string;
  campaign_name?: string;
  platform?: string;
  field_data: MetaFieldDatum[];
};

/** The normalised shape we map into a CRM enquiry. */
export type MappedLead = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message: string | null;
  budget: string | null;
  country: string | null;
};

/**
 * Fetch the full lead (incl. `field_data`) from the Graph API.
 * Requires `META_PAGE_ACCESS_TOKEN` with the `leads_retrieval` permission.
 * Throws on a non-OK response so the caller can log + skip the lead.
 */
export async function fetchMetaLead(leadgenId: string): Promise<MetaLead> {
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  if (!token) throw new Error("META_PAGE_ACCESS_TOKEN is not set");

  const fields =
    "field_data,created_time,ad_id,ad_name,form_id,campaign_id,campaign_name,platform";
  const url =
    `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(leadgenId)}` +
    `?fields=${fields}&access_token=${encodeURIComponent(token)}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Graph API ${res.status} for lead ${leadgenId}: ${body.slice(0, 300)}`);
  }
  return (await res.json()) as MetaLead;
}

async function graphGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Graph API ${res.status}: ${body.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

function pageToken(): string {
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  if (!token) throw new Error("META_PAGE_ACCESS_TOKEN is not set");
  return token;
}

/** List the lead forms on a Page (paginated). Needs a Page token. */
export async function fetchPageLeadForms(
  pageId: string,
): Promise<{ id: string; name: string }[]> {
  const token = pageToken();
  const out: { id: string; name: string }[] = [];
  let url =
    `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(pageId)}/leadgen_forms` +
    `?fields=id,name&limit=100&access_token=${encodeURIComponent(token)}`;
  // Follow paging.next until exhausted (guard against runaway loops).
  for (let i = 0; i < 50 && url; i++) {
    const page = await graphGet<{ data?: { id: string; name: string }[]; paging?: { next?: string } }>(url);
    out.push(...(page.data ?? []));
    url = page.paging?.next ?? "";
  }
  return out;
}

/**
 * List every lead for a form (paginated). Each row already carries `field_data`,
 * so `mapLeadFieldData` can be applied directly (no per-lead fetch). Needs a
 * Page token with `leads_retrieval`.
 */
export async function fetchFormLeads(formId: string): Promise<MetaLead[]> {
  const token = pageToken();
  const fields =
    "id,created_time,ad_id,ad_name,campaign_id,campaign_name,platform,field_data";
  const out: MetaLead[] = [];
  let url =
    `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(formId)}/leads` +
    `?fields=${fields}&limit=100&access_token=${encodeURIComponent(token)}`;
  for (let i = 0; i < 200 && url; i++) {
    const page = await graphGet<{ data?: MetaLead[]; paging?: { next?: string } }>(url);
    out.push(...(page.data ?? []));
    url = page.paging?.next ?? "";
  }
  return out;
}

const val = (fd: MetaFieldDatum[], ...names: string[]): string | undefined => {
  for (const n of names) {
    const hit = fd.find((f) => f.name?.toLowerCase() === n);
    const v = hit?.values?.find((x) => x && x.trim());
    if (v) return v.trim();
  }
  return undefined;
};

function splitFullName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().replace(/\s+/g, " ").split(" ");
  if (parts.length <= 1) return { firstName: parts[0] || "", lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

// Standard Lead Ads field names we map to structured columns; everything else
// becomes free-text in the enquiry `message`.
const KNOWN = new Set([
  "full_name",
  "first_name",
  "last_name",
  "email",
  "phone_number",
  "city",
  "country",
  "budget",
]);

/** Map Graph `field_data` (+ ad context) into the CRM enquiry shape. */
export function mapLeadFieldData(lead: MetaLead): MappedLead {
  const fd = lead.field_data ?? [];

  let firstName = val(fd, "first_name") ?? "";
  let lastName = val(fd, "last_name") ?? "";
  if (!firstName && !lastName) {
    const full = val(fd, "full_name", "name");
    if (full) ({ firstName, lastName } = splitFullName(full));
  }

  const email = val(fd, "email") ?? "";
  const phone = val(fd, "phone_number", "phone") ?? "";
  const country = val(fd, "country") ?? null;
  const city = val(fd, "city");
  const budget = val(fd, "budget") ?? null;

  // Fold any custom questions + useful ad context into the message.
  const extras: string[] = [];
  if (city) extras.push(`City: ${city}`);
  for (const f of fd) {
    if (KNOWN.has(f.name?.toLowerCase())) continue;
    const answer = (f.values ?? []).join(", ").trim();
    if (answer) extras.push(`${f.name}: ${answer}`);
  }
  const ctx = lead.campaign_name || lead.ad_name;
  if (ctx) extras.push(`Facebook Lead Ads${ctx ? ` — ${ctx}` : ""}`);

  return {
    firstName,
    lastName,
    email,
    phone,
    message: extras.length ? extras.join("\n") : null,
    budget,
    country,
  };
}
