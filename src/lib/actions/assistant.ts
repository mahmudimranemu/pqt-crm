"use server";

import prisma from "@/lib/prisma";
import { auth, type ExtendedSession } from "@/lib/auth";
import { generateWithTask } from "@/lib/ai/generate";
import {
  ASSISTANT_SYSTEM_PROMPT,
  tryParseIntent,
} from "@/lib/assistant/prompt";
import {
  executeIntent,
  INTENT_NAMES,
  type IntentName,
} from "@/lib/assistant/intents";
import type { AssistantResult } from "@/lib/assistant/types";

async function requireSuperAdmin() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role !== "SUPER_ADMIN") {
    throw new Error("Unauthorized - Super Admin access required");
  }
  return session;
}

export async function searchAssistantUsers(query: string) {
  await requireSuperAdmin();
  const q = query.trim();
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      ...(q
        ? {
            OR: [
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: { id: true, firstName: true, lastName: true, email: true, role: true },
    orderBy: { firstName: "asc" },
    take: 8,
  });
  return users;
}

export interface AssistantHistoryTurn {
  role: "user" | "assistant";
  // For user turns: original text (with @[Name](id) mentions intact).
  // For assistant turns: a short summary string.
  content: string;
}

function buildUserPrompt(history: AssistantHistoryTurn[], current: string): string {
  if (history.length === 0) return `USER: ${current}`;
  const lines = ["Conversation so far:"];
  for (const t of history) {
    lines.push(`${t.role.toUpperCase()}: ${t.content}`);
  }
  lines.push("");
  lines.push("Current message:");
  lines.push(`USER: ${current}`);
  return lines.join("\n");
}

export async function runAssistant(
  message: string,
  history: AssistantHistoryTurn[] = [],
): Promise<AssistantResult> {
  await requireSuperAdmin();
  const trimmed = message.trim();
  if (!trimmed) return { kind: "text", text: "Please type a question." };

  // Keep only the last 6 turns to control prompt size
  const trimmedHistory = history.slice(-6);

  let raw: string;
  try {
    raw = await generateWithTask(
      "assistant_chat",
      ASSISTANT_SYSTEM_PROMPT,
      buildUserPrompt(trimmedHistory, trimmed),
    );
  } catch (err) {
    return {
      kind: "text",
      text:
        err instanceof Error
          ? `AI is not configured: ${err.message}`
          : "AI request failed.",
    };
  }

  const parsed = tryParseIntent(raw);
  if (!parsed || typeof parsed.intent !== "string") {
    return {
      kind: "text",
      text: raw.trim() || "I couldn't understand that — try rephrasing.",
    };
  }

  if (!(INTENT_NAMES as readonly string[]).includes(parsed.intent)) {
    return {
      kind: "text",
      text: parsed.reply?.trim() || "I couldn't map that to an action yet.",
    };
  }

  return executeIntent({
    intent: parsed.intent as IntentName,
    params: parsed.params,
    reply: parsed.reply,
  });
}

