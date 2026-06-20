"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { auth, type ExtendedSession } from "@/lib/auth";
import { auditLog } from "@/lib/audit";
import { generateWithTask } from "@/lib/ai/generate";
import {
  buildClientProfileContext,
  CLIENT_PROFILE_SYSTEM_PROMPT,
  parseClientProfile,
} from "@/lib/ai/prompts";
import {
  validateMinimum,
  type ClientProfile,
} from "@/lib/profile/schema";

async function requireSession() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

/** Shallow per-group merge so agent-supplied fields win over the AI draft. */
function applyOverrides(
  profile: ClientProfile,
  overrides?: Partial<ClientProfile>,
): ClientProfile {
  if (!overrides) return profile;
  const out = { ...profile } as Record<string, unknown>;
  for (const [group, value] of Object.entries(overrides)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      out[group] = { ...(out[group] as object), ...(value as object) };
    } else if (value != null) {
      out[group] = value;
    }
  }
  return out as ClientProfile;
}

/**
 * Generate (but do not save) a structured profile for a lead's client. Returns
 * the draft plus any still-missing minimum requirements so the UI can prompt.
 * Fully guarded so it never throws an unhandled server-action error.
 */
export async function generateClientProfile(
  leadId: string,
  overrides?: Partial<ClientProfile>,
): Promise<
  | { ok: true; profile: ClientProfile; missing: string[] }
  | { ok: false; error: string }
> {
  try {
    await requireSession();
    let context = await buildClientProfileContext(leadId);
    if (overrides) {
      context += `\n\n== Agent-provided (authoritative) ==\n${JSON.stringify(
        overrides,
      )}`;
    }
    const raw = await generateWithTask(
      "client_profile",
      CLIENT_PROFILE_SYSTEM_PROMPT,
      context,
      "assistant_chat",
      4096, // large structured JSON — must not truncate
    );
    const profile = applyOverrides(parseClientProfile(raw), overrides);
    // Guarantee a plain, serializable object crosses the action boundary.
    const plain = JSON.parse(JSON.stringify(profile)) as ClientProfile;
    return { ok: true, profile: plain, missing: validateMinimum(plain) };
  } catch (e) {
    console.error("generateClientProfile failed:", e);
    const msg =
      e instanceof Error && /not configured|not enabled|no API key/i.test(e.message)
        ? "AI isn't configured yet — set a provider in Settings → AI."
        : e instanceof Error && /unauthorized|forbidden/i.test(e.message)
          ? "Your session looks expired — refresh and try again."
          : "Couldn't generate the profile. Please try again.";
    return { ok: false, error: msg };
  }
}

/** Persist a (possibly agent-edited) profile onto the lead's client. */
export async function saveClientProfile(
  leadId: string,
  profile: ClientProfile,
): Promise<{ ok: true; clientId: string } | { ok: false; error: string }> {
  try {
    await requireSession();
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { clientId: true },
    });
    if (!lead) return { ok: false, error: "Lead not found." };

    const now = new Date();
    const stored: ClientProfile = {
      ...profile,
      meta: {
        ...(profile.meta ?? {}),
        generatedAt: now.toISOString(),
        sourceLeadId: leadId,
      },
    };

    await prisma.client.update({
      where: { id: lead.clientId },
      data: {
        // Plain JSON only — strip any undefined.
        aiProfile: JSON.parse(JSON.stringify(stored)),
        aiProfileGeneratedAt: now,
        aiProfileSourceLeadId: leadId,
      },
    });

    await auditLog("UPDATE", "Client", lead.clientId, {
      aiProfile: { sourceLeadId: leadId },
    });

    revalidatePath(`/clients/${lead.clientId}`);
    revalidatePath(`/leads/${leadId}`);
    return { ok: true, clientId: lead.clientId };
  } catch (e) {
    console.error("saveClientProfile failed:", e);
    return { ok: false, error: "Couldn't save the profile. Please try again." };
  }
}

/**
 * Manually update a client's profile directly from the client page (no lead /
 * AI involved). Lets agents correct or fill in the profile by hand.
 */
export async function updateClientProfile(
  clientId: string,
  profile: ClientProfile,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireSession();
    const now = new Date();
    const stored: ClientProfile = {
      ...profile,
      meta: {
        ...(profile.meta ?? {}),
        generatedAt: now.toISOString(),
        aiNotes: "Manually edited by an agent.",
      },
    };
    await prisma.client.update({
      where: { id: clientId },
      data: {
        aiProfile: JSON.parse(JSON.stringify(stored)),
        aiProfileGeneratedAt: now,
      },
    });
    await auditLog("UPDATE", "Client", clientId, { aiProfile: { manual: true } });
    revalidatePath(`/clients/${clientId}`);
    return { ok: true };
  } catch (e) {
    console.error("updateClientProfile failed:", e);
    return { ok: false, error: "Couldn't save the profile. Please try again." };
  }
}
