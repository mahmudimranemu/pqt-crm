"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { auth, type ExtendedSession } from "@/lib/auth";
import { auditLog } from "@/lib/audit";
import { encryptSecret, maskApiKey } from "@/lib/crypto";
import { sendEmail } from "@/lib/email";
import {
  AI_PROVIDERS,
  AI_TASKS,
  generateWithTask,
  type AIProviderId,
  type AITaskType,
} from "@/lib/ai/generate";
import {
  buildLeadContext,
  EMAIL_SYSTEM_PROMPT,
  WHATSAPP_SYSTEM_PROMPT,
  parseEmailOutput,
} from "@/lib/ai/prompts";

async function requireSuperAdmin() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role !== "SUPER_ADMIN") {
    throw new Error("Unauthorized - Super Admin access required");
  }
  return session;
}

async function requireSession() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

export async function getAISettings() {
  await requireSuperAdmin();
  const [providers, tasks] = await Promise.all([
    prisma.aIProvider.findMany(),
    prisma.aITaskConfig.findMany(),
  ]);

  const providerMap = new Map(providers.map((p) => [p.provider, p]));
  const taskMap = new Map(tasks.map((t) => [t.taskType, t]));

  return {
    providers: AI_PROVIDERS.map((meta) => {
      const row = providerMap.get(meta.id);
      return {
        provider: meta.id,
        label: meta.label,
        defaultModel: meta.defaultModel,
        isEnabled: row?.isEnabled ?? false,
        hasKey: Boolean(row?.apiKeyEncrypted),
        keyHint: row?.apiKeyHint ?? null,
      };
    }),
    tasks: AI_TASKS.map((meta) => {
      const row = taskMap.get(meta.id);
      return {
        taskType: meta.id,
        label: meta.label,
        provider: row?.provider ?? null,
        model: row?.model ?? null,
      };
    }),
  };
}

export async function upsertAIProvider(input: {
  provider: AIProviderId;
  apiKey?: string;
  isEnabled: boolean;
}) {
  await requireSuperAdmin();

  if (!AI_PROVIDERS.some((p) => p.id === input.provider)) {
    throw new Error("Unknown provider");
  }

  const trimmedKey = input.apiKey?.trim();
  const data: {
    isEnabled: boolean;
    apiKeyEncrypted?: string;
    apiKeyHint?: string;
  } = { isEnabled: input.isEnabled };

  if (trimmedKey) {
    data.apiKeyEncrypted = encryptSecret(trimmedKey);
    data.apiKeyHint = maskApiKey(trimmedKey);
  }

  const existing = await prisma.aIProvider.findUnique({
    where: { provider: input.provider },
  });

  // Cannot enable without a stored key
  if (input.isEnabled && !trimmedKey && !existing?.apiKeyEncrypted) {
    throw new Error("Add an API key before enabling this provider.");
  }

  const row = await prisma.aIProvider.upsert({
    where: { provider: input.provider },
    create: { provider: input.provider, ...data },
    update: data,
  });

  await auditLog("UPDATE", "AIProvider", row.id, {
    provider: input.provider,
    keyChanged: Boolean(trimmedKey),
    isEnabled: input.isEnabled,
  });

  revalidatePath("/settings/ai");
  return { ok: true };
}

export async function upsertAITaskConfig(input: {
  taskType: AITaskType;
  provider: AIProviderId;
  model: string;
}) {
  await requireSuperAdmin();

  if (!AI_TASKS.some((t) => t.id === input.taskType)) {
    throw new Error("Unknown task type");
  }
  if (!AI_PROVIDERS.some((p) => p.id === input.provider)) {
    throw new Error("Unknown provider");
  }
  const model = input.model.trim();
  if (!model) throw new Error("Model is required");

  const row = await prisma.aITaskConfig.upsert({
    where: { taskType: input.taskType },
    create: { taskType: input.taskType, provider: input.provider, model },
    update: { provider: input.provider, model },
  });

  await auditLog("UPDATE", "AITaskConfig", row.id, {
    taskType: input.taskType,
    provider: input.provider,
    model,
  });

  revalidatePath("/settings/ai");
  return { ok: true };
}

export async function generateLeadWhatsApp(leadId: string) {
  await requireSession();
  const context = await buildLeadContext(leadId);
  const text = await generateWithTask(
    "whatsapp_generation",
    WHATSAPP_SYSTEM_PROMPT,
    context,
  );
  return { text: text.trim() };
}

export async function generateLeadEmail(leadId: string) {
  await requireSession();
  const context = await buildLeadContext(leadId);
  const raw = await generateWithTask(
    "email_generation",
    EMAIL_SYSTEM_PROMPT,
    context,
  );
  return parseEmailOutput(raw);
}

export async function sendLeadEmail(input: {
  leadId: string;
  to: string;
  subject: string;
  body: string;
}) {
  await requireSession();
  const subject = input.subject.trim();
  const body = input.body.trim();
  const to = input.to.trim();
  if (!to || !subject || !body) {
    throw new Error("Recipient, subject, and body are all required.");
  }
  const html = body
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`)
    .join("");
  const ok = await sendEmail(to, subject, html);
  if (!ok) throw new Error("Email failed to send. Check SMTP configuration.");

  await auditLog("UPDATE", "Lead", input.leadId, {
    emailSent: { to, subject },
  });

  return { ok: true };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
