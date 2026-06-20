import prisma from "@/lib/prisma";
import { normalizeProfile, type ClientProfile } from "@/lib/profile/schema";

export async function buildLeadContext(leadId: string): Promise<string> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      client: true,
      owner: { select: { firstName: true, lastName: true, email: true } },
      interestedProperty: {
        select: {
          name: true,
          pqtNumber: true,
          district: true,
          propertyType: true,
          bedrooms: true,
          priceFrom: true,
          priceTo: true,
        },
      },
      notes: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { agent: { select: { firstName: true, lastName: true } } },
      },
    },
  });
  if (!lead) throw new Error("Lead not found");

  const lines: string[] = [];
  const c = lead.client;

  lines.push("== Client ==");
  lines.push(`Name: ${c.firstName} ${c.lastName}`);
  lines.push(`Email: ${c.email}`);
  if (c.phone) lines.push(`Phone: ${c.phone}`);
  if (c.whatsapp) lines.push(`WhatsApp: ${c.whatsapp}`);
  if (c.nationality) lines.push(`Nationality: ${c.nationality}`);
  if (c.country) lines.push(`Country: ${c.country}`);
  if (c.city) lines.push(`City: ${c.city}`);
  if (c.budgetMin || c.budgetMax) {
    lines.push(`Client budget: ${c.budgetMin ?? "?"} – ${c.budgetMax ?? "?"}`);
  }
  if (c.preferredPropertyType)
    lines.push(`Prefers: ${c.preferredPropertyType}`);
  if (c.investmentPurpose) lines.push(`Purpose: ${c.investmentPurpose}`);

  lines.push("");
  lines.push("== Lead ==");
  lines.push(`Title: ${lead.title}`);
  if (lead.description) lines.push(`Description: ${lead.description}`);
  lines.push(`Stage: ${lead.stage}`);
  if (lead.segment) lines.push(`Segment: ${lead.segment}`);
  if (lead.priority) lines.push(`Priority: ${lead.priority}`);
  if (lead.temperature) lines.push(`Temperature: ${lead.temperature}`);
  if (lead.estimatedValue) {
    lines.push(`Estimated value: ${lead.estimatedValue} ${lead.currency}`);
  }
  if (lead.budgetRange) lines.push(`Budget range: ${lead.budgetRange}`);
  if (lead.preferredLocation)
    lines.push(`Preferred location: ${lead.preferredLocation}`);
  if (lead.propertyType) lines.push(`Property type: ${lead.propertyType}`);
  lines.push(`Source: ${lead.source}`);

  if (lead.interestedProperty) {
    const p = lead.interestedProperty;
    lines.push("");
    lines.push("== Interested property ==");
    lines.push(`${p.name} (${p.pqtNumber})`);
    if (p.district) lines.push(`District: ${p.district}`);
    if (p.propertyType) lines.push(`Type: ${p.propertyType}`);
    if (p.bedrooms) lines.push(`Bedrooms: ${p.bedrooms}`);
    if (p.priceFrom || p.priceTo) {
      lines.push(`Price range: ${p.priceFrom ?? "?"} – ${p.priceTo ?? "?"}`);
    }
  }

  if (lead.notes.length) {
    lines.push("");
    lines.push("== Recent notes (newest first) ==");
    for (const n of lead.notes) {
      const when = n.createdAt.toISOString().slice(0, 10);
      const who = `${n.agent.firstName} ${n.agent.lastName}`;
      lines.push(`[${when} – ${who}] ${n.content}`);
    }
  }

  lines.push("");
  lines.push("== Agent ==");
  lines.push(`Name: ${lead.owner.firstName} ${lead.owner.lastName}`);
  lines.push(`Email: ${lead.owner.email}`);

  return lines.join("\n");
}

export const WHATSAPP_SYSTEM_PROMPT = `You are a sales consultant at Property Quest Turkey, a real-estate agency. Write a single WhatsApp message to a client based on the lead context provided.

Sound like a real person typing on their phone — warm, natural, genuinely helpful. Never like a template or an AI.

Message rules:
- Keep it short: 3–5 short sentences, easy to read at a glance on a phone.
- Break it into 2–3 short lines with a blank line between them (greeting → the one relevant detail → next step). Avoid one dense block of text.
- Open with the client's first name in a natural greeting. Skip stiff openers like "I hope this message finds you well."
- Reference only the single most relevant detail from the notes or the property they're interested in — do not list everything.
- Use natural contractions ("I'd", "you're", "let's") and a friendly, unforced tone.
- At most one emoji, and only if it genuinely fits — never force it.
- Never invent prices, dates, locations, or any fact that isn't in the context.
- End with one clear, low-friction next step: a simple question or a suggested time to talk.
- Sign off with the agent's first name only, on its own line.
- If the client's preferred language is clear from the context, write in that language; otherwise write in English.

Output ONLY the message body — no preamble, no explanation, no markdown, no surrounding quotes.`;

export const EMAIL_SYSTEM_PROMPT = `You are a sales consultant at Property Quest Turkey, a real-estate agency. Write a professional follow-up email to a client based on the lead context provided.

Sound like a thoughtful human consultant who knows this client — warm, clear, and respectful of their time. Never like a mass-mailed template or an AI.

Tone and length:
- Warm but professional. Around 120–160 words for the body.
- Easy to skim: short paragraphs of 1–3 sentences each, with a blank line between them. No long dense blocks.

Subject line:
- Specific and personal, not generic. Reference the client or the property where possible.
- Avoid spammy or salesy phrasing (no "Amazing offer", no ALL CAPS, no exclamation marks).

Body rules:
- Open with a natural greeting using the client's first name ("Dear <First name>," or "Hi <First name>,").
- Reference the single most relevant specific from the notes or the property they're interested in — do not list everything.
- Use natural, contraction-friendly language; avoid stiff filler like "I hope this email finds you well" or "Please do not hesitate to."
- Never invent prices, dates, locations, availability, or any fact not in the context.
- End with one clear, low-friction next step: a direct question or a suggested call/meeting.
- Close with a brief professional sign-off ("Best regards," or "Kind regards,") followed by the agent's full name on the next line, then "Property Quest Turkey".
- If the client's preferred language is clear from the context, write in that language; otherwise write in English.

Output strictly in this format and nothing else:
Subject: <subject line>

<email body>`;

export function parseEmailOutput(raw: string): {
  subject: string;
  body: string;
} {
  const text = raw.trim();
  const match = text.match(/^Subject:\s*(.+?)\s*\n([\s\S]*)$/i);
  if (match) return { subject: match[1].trim(), body: match[2].trim() };
  return { subject: "Following up on your enquiry", body: text };
}

/* ========================================================================
   CLIENT PROFILE — richer context + system prompt + JSON parser.
   ======================================================================== */

/** Like buildLeadContext but with the extra signals the profile needs. */
export async function buildClientProfileContext(leadId: string): Promise<string> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      client: true,
      owner: { select: { firstName: true, lastName: true, email: true } },
      interestedProperty: {
        select: {
          name: true,
          pqtNumber: true,
          district: true,
          propertyType: true,
          bedrooms: true,
          priceFrom: true,
          priceTo: true,
          amenities: true,
          citizenshipEligible: true,
        },
      },
      notes: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { agent: { select: { firstName: true, lastName: true } } },
      },
      activities: {
        orderBy: { createdAt: "desc" },
        take: 15,
        select: { type: true, title: true, createdAt: true },
      },
    },
  });
  if (!lead) throw new Error("Lead not found");

  const c = lead.client;
  const lines: string[] = [];

  lines.push("== Client ==");
  lines.push(`Name: ${c.firstName} ${c.lastName}`);
  lines.push(`Contact: ${c.email}${c.whatsapp ? ` / WhatsApp ${c.whatsapp}` : ""}${c.phone ? ` / ${c.phone}` : ""}`);
  if (c.nationality) lines.push(`Nationality: ${c.nationality}`);
  if (c.country) lines.push(`Country of residence: ${c.country}`);
  if (c.city) lines.push(`City: ${c.city}`);
  if (c.budgetMin || c.budgetMax)
    lines.push(`Client budget: ${c.budgetMin ?? "?"} – ${c.budgetMax ?? "?"}`);
  if (c.preferredPropertyType) lines.push(`Preferred property type: ${c.preferredPropertyType}`);
  if (c.preferredDistricts?.length)
    lines.push(`Preferred districts: ${c.preferredDistricts.join(", ")}`);
  if (c.investmentPurpose) lines.push(`Investment purpose: ${c.investmentPurpose}`);
  if (c.tags?.length) lines.push(`Tags: ${c.tags.join(", ")}`);
  if (c.notes) lines.push(`Client notes: ${c.notes}`);

  lines.push("");
  lines.push("== Lead ==");
  lines.push(`Title: ${lead.title}`);
  if (lead.description) lines.push(`Description: ${lead.description}`);
  lines.push(`Stage: ${lead.stage}`);
  if (lead.segment) lines.push(`Segment: ${lead.segment}`);
  if (lead.priority) lines.push(`Priority: ${lead.priority}`);
  if (lead.temperature) lines.push(`Temperature: ${lead.temperature}`);
  if (lead.score != null) lines.push(`Lead score: ${lead.score}`);
  if (lead.estimatedValue) lines.push(`Estimated value: ${lead.estimatedValue} ${lead.currency}`);
  if (lead.budgetRange) lines.push(`Budget range: ${lead.budgetRange}`);
  if (lead.preferredLocation) lines.push(`Preferred location: ${lead.preferredLocation}`);
  if (lead.propertyType) lines.push(`Property type: ${lead.propertyType}`);
  lines.push(`Source: ${lead.source}${lead.sourceChannel ? ` (${lead.sourceChannel})` : ""}`);
  if (lead.interestedPropertyRefs?.length)
    lines.push(`Interested property refs: ${lead.interestedPropertyRefs.join(", ")}`);

  if (lead.interestedProperty) {
    const p = lead.interestedProperty;
    lines.push("");
    lines.push("== Interested property ==");
    lines.push(`${p.name} (${p.pqtNumber})`);
    if (p.district) lines.push(`District: ${p.district}`);
    if (p.propertyType) lines.push(`Type: ${p.propertyType}`);
    if (p.bedrooms) lines.push(`Bedrooms: ${p.bedrooms}`);
    if (p.priceFrom || p.priceTo) lines.push(`Price range: ${p.priceFrom ?? "?"} – ${p.priceTo ?? "?"}`);
    if (p.amenities?.length) lines.push(`Amenities: ${p.amenities.join(", ")}`);
    if (p.citizenshipEligible) lines.push(`Citizenship eligible: yes`);
  }

  if (lead.notes.length) {
    lines.push("");
    lines.push("== Recent notes (newest first) ==");
    for (const n of lead.notes) {
      const when = n.createdAt.toISOString().slice(0, 10);
      const who = `${n.agent.firstName} ${n.agent.lastName}`;
      lines.push(`[${when} – ${who}] ${n.content}`);
    }
  }

  if (lead.activities.length) {
    lines.push("");
    lines.push("== Recent activity ==");
    for (const a of lead.activities) {
      const when = a.createdAt.toISOString().slice(0, 10);
      lines.push(`[${when}] ${a.type}: ${a.title}`);
    }
  }

  lines.push("");
  lines.push("== Agent ==");
  lines.push(`Name: ${lead.owner.firstName} ${lead.owner.lastName}`);

  return lines.join("\n");
}

export const CLIENT_PROFILE_SYSTEM_PROMPT = `You are a real-estate buyer analyst for Property Quest Turkey. From the CRM context provided, produce a structured CLIENT PROFILE as a single JSON object — and NOTHING else (no markdown, no backticks, no commentary).

Return EXACTLY this shape (use null for unknown scalar fields and [] for unknown arrays — never invent CRM facts):
{
  "identity": { "name": string|null, "preferredLanguage": string|null, "contactChannel": "Email"|"WhatsApp"|"Phone"|null, "countryOfResidence": string|null, "nationality": string|null },
  "budget": { "min": number|null, "max": number|null, "currency": string|null, "paymentMethod": "Cash"|"Installments"|"Mortgage"|null, "financingNeeded": boolean|null, "feesInclusive": boolean|null },
  "intent": { "primaryGoals": string[], "urgency": string|null },
  "requirements": { "propertyTypes": string[], "readiness": "Ready"|"Off-plan"|"Either"|null, "bedrooms": string|null, "bathrooms": string|null, "sizeSqm": string|null, "mustHaves": string[], "niceToHaves": string[] },
  "location": { "regions": string[], "districts": string[], "proximity": string[] },
  "family": { "familySize": string|null, "children": string|null, "relocating": boolean|null, "schoolPreference": "International"|"Local"|"No preference"|null, "languageOfInstruction": string|null, "accessibilityNeeds": string|null },
  "investment": { "targetYieldPct": string|null, "expectedAppreciation": string|null, "holdPeriod": string|null, "rentalStrategy": string|null, "riskAppetite": string|null } | null,
  "citizenship": { "wantsCitizenship": boolean|null, "familyMembers": string|null, "targetTimeline": string|null, "sourceOfFundsReady": boolean|null } | null,
  "dealBreakers": string[],
  "signals": { "leadSource": string|null, "viewedProperties": string[], "pastInteractions": string|null, "notesSummary": string|null },
  "insights": { "neighbourhood": string|null, "schools": string|null, "investmentOutlook": string|null }
}

Rules:
- "primaryGoals" is the master field. Pick from: "Relocation / living", "Holiday home", "Rental income", "Capital appreciation", "Citizenship (CBI)". Infer from the lead segment, investment purpose, and the notes.
- Set "investment" to the object ONLY if intent includes Rental income / Capital appreciation / investment; otherwise set it to null.
- Set "citizenship" to the object ONLY if intent includes Citizenship (CBI); otherwise null.
- The factual groups (identity, budget, requirements, location, signals) must come from the CRM context only. Infer intent, must/nice-to-haves, deal-breakers and notesSummary from the notes where reasonable.
- "insights" (neighbourhood, schools, investmentOutlook) is the ONLY place you may use general knowledge about the area/district. Keep each to 1–3 sentences and write them as helpful AI guidance to verify locally — never as confirmed facts.
- TURKEY CITIZENSHIP-BY-INVESTMENT RULES: the minimum real-estate investment is US$400,000 with a mandatory 3-year hold. If the client's intent is CBI and their budget is below US$400,000, say so plainly in "insights.investmentOutlook" and never imply a sub-threshold purchase qualifies.
- Be concise and specific. Output ONLY the JSON object.`;

export const LEAD_OVERVIEW_SYSTEM_PROMPT = `You are a senior real-estate sales coach for Property Quest Turkey. Using the CRM context for ONE lead, write a tight decision-support overview the agent can read in 20 seconds and act on.

Write 2 short paragraphs of plain prose (no markdown, no headings, no bullet list, ~90–140 words total):
1) WHO + WHERE THEY ARE: who this client is, what they want (budget, type, area, intent — incl. citizenship if relevant), and where the lead stands right now based on the most recent notes and call activity (warmth, objections, momentum, what was last discussed).
2) NEXT STEP TO WIN: the single most important next action the agent should take now and why, plus the angle/talking point most likely to move it forward. Be specific (e.g. "call before Thursday to confirm the viewing and lead with the 3-bed sea-view unit under their €400k budget"). If something is blocking the deal, name it and how to unblock it. If data is missing that would change the play, say what to ask.

Use only facts from the context; you may add brief, clearly-practical sales judgement. Turkey citizenship-by-investment minimum is US$400,000 with a 3-year hold — never advise a sub-threshold purchase to a citizenship buyer. Output only the two paragraphs.`;

/** Strip fences, parse, and coerce to a guaranteed-complete ClientProfile. */
export function parseClientProfile(raw: string): ClientProfile {
  const text = raw.replace(/```json|```/g, "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  const json = start >= 0 && end > start ? text.slice(start, end + 1) : text;
  return normalizeProfile(JSON.parse(json));
}
