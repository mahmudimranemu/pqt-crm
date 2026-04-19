import prisma from "@/lib/prisma";

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
  if (c.preferredPropertyType) lines.push(`Prefers: ${c.preferredPropertyType}`);
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
  if (lead.preferredLocation) lines.push(`Preferred location: ${lead.preferredLocation}`);
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

export const WHATSAPP_SYSTEM_PROMPT = `You are a sales consultant at Property Quest Turkey, a real-estate agency.
Write a single, friendly WhatsApp message to the client based on the lead context.

Rules:
- Keep it short (3–6 sentences max), warm, conversational, mobile-friendly.
- Use the client's first name.
- Reference the most relevant detail from the notes or interested property — do not list everything.
- Do NOT invent prices, dates, or facts not in the context.
- End with a clear, low-friction next step (a question or a suggested time).
- Sign off with the agent's first name only.
- Output ONLY the message body. No preamble, no markdown, no quotes.`;

export const EMAIL_SYSTEM_PROMPT = `You are a sales consultant at Property Quest Turkey, a real-estate agency.
Write a professional follow-up email to the client based on the lead context.

Rules:
- Tone: warm but professional. Concise (around 120–180 words).
- Reference specifics from the notes or interested property where relevant; do not list everything.
- Do NOT invent prices, dates, or facts not in the context.
- End with a clear next step (a question or a suggested call/meeting).
- Sign off with the agent's full name.
- Output strictly in this format and nothing else:

Subject: <subject line>

<email body>`;

export function parseEmailOutput(raw: string): { subject: string; body: string } {
  const text = raw.trim();
  const match = text.match(/^Subject:\s*(.+?)\s*\n([\s\S]*)$/i);
  if (match) return { subject: match[1].trim(), body: match[2].trim() };
  return { subject: "Following up on your enquiry", body: text };
}
