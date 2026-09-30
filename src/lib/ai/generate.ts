import prisma from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";

export type AIProviderId = "anthropic" | "openai" | "gemini" | "groq";
export type AITaskType =
  | "whatsapp_generation"
  | "email_generation"
  | "assistant_chat"
  | "client_profile"
  | "lead_overview";

export const AI_PROVIDERS: {
  id: AIProviderId;
  label: string;
  defaultModel: string;
  // Fallback model list, default first. Settings → AI loads the provider's
  // live list with the saved key (listProviderModels); this is only shown
  // when that fails. Names here go stale — Google retired gemini-1.5/2.0.
  models: string[];
}[] = [
  {
    id: "anthropic",
    label: "Anthropic (Claude)",
    defaultModel: "claude-haiku-4-5-20251001",
    models: ["claude-haiku-4-5-20251001", "claude-sonnet-5", "claude-opus-5-5"],
  },
  {
    id: "openai",
    label: "OpenAI",
    defaultModel: "gpt-4o-mini",
    models: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "gpt-4.1"],
  },
  {
    id: "gemini",
    label: "Google Gemini",
    defaultModel: "gemini-3.8-flash",
    models: ["gemini-3.8-flash"],
  },
  {
    id: "groq",
    label: "Groq",
    // llama-3.3-70b-versatile was retired by Groq.
    defaultModel: "openai/gpt-oss-120b",
    models: ["openai/gpt-oss-120b", "openai/gpt-oss-20b"],
  },
];

export const AI_TASKS: { id: AITaskType; label: string }[] = [
  { id: "whatsapp_generation", label: "WhatsApp message generation" },
  { id: "email_generation", label: "Email generation" },
  { id: "assistant_chat", label: "Assistant chat (intent extraction)" },
  { id: "client_profile", label: "Client profile generation" },
  { id: "lead_overview", label: "Lead overview / next-step coaching" },
];

interface CallArgs {
  provider: AIProviderId;
  model: string;
  apiKey: string;
  systemPrompt: string;
  userPrompt: string;
  /** Output token cap. Defaults to 1024 — raise for large structured outputs. */
  maxTokens?: number;
  /** Sampling temperature. Defaults to 0.7 (drafting); analysis uses 0.2. */
  temperature?: number;
  /** Aborts the provider call — e.g. AbortSignal.timeout(30_000). */
  signal?: AbortSignal;
}

/** The text plus what the provider says it used — for cost tracking. */
export interface Completion {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

async function callAnthropic({ model, apiKey, systemPrompt, userPrompt, maxTokens, temperature, signal }: CallArgs): Promise<Completion> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    signal,
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens ?? 1024,
      ...(temperature !== undefined ? { temperature } : {}),
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return {
    text: data.content?.[0]?.text ?? "",
    model: data.model ?? model,
    inputTokens: data.usage?.input_tokens ?? 0,
    outputTokens: data.usage?.output_tokens ?? 0,
  };
}

async function callOpenAICompat(url: string, { model, apiKey, systemPrompt, userPrompt, maxTokens, temperature, signal }: CallArgs): Promise<Completion> {
  const res = await fetch(url, {
    method: "POST",
    signal,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: temperature ?? 0.7,
      max_tokens: maxTokens ?? 1024,
    }),
  });
  if (!res.ok) throw new Error(`${url} ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return {
    text: data.choices?.[0]?.message?.content ?? "",
    model: data.model ?? model,
    inputTokens: data.usage?.prompt_tokens ?? 0,
    outputTokens: data.usage?.completion_tokens ?? 0,
  };
}

async function callGemini({ model, apiKey, systemPrompt, userPrompt, temperature, signal }: CallArgs): Promise<Completion> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    signal,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      ...(temperature !== undefined ? { generationConfig: { temperature } } : {}),
      // No output cap for Gemini: its newer models "think" first and the
      // thinking counts against maxOutputTokens, so 1024 cut replies short.
      // The prompts already ask for short output.
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return {
    text:
      data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "",
    model: data.modelVersion ?? model,
    inputTokens: data.usageMetadata?.promptTokenCount ?? 0,
    outputTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
  };
}

/** Not chat models — embeddings, speech, images, video, moderation… */
const NON_CHAT =
  /embed|tts|whisper|audio|image|imagen|veo|dall-e|moderation|realtime|transcribe|guard|aqa|live|search/i;

/**
 * The chat models this key can use, fetched live from the provider, so
 * Settings → AI offers what really exists instead of a list that goes stale.
 */
export async function listProviderModels(
  provider: AIProviderId,
  apiKey: string,
): Promise<string[]> {
  let ids: string[] = [];
  if (provider === "gemini") {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000&key=${encodeURIComponent(apiKey)}`,
    );
    if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as {
      models?: { name: string; supportedGenerationMethods?: string[] }[];
    };
    ids = (data.models ?? [])
      .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
      .map((m) => m.name.replace(/^models\//, ""))
      .filter((id) => id.startsWith("gemini"));
  } else if (provider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/models?limit=1000", {
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    });
    if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
    ids = ((await res.json()) as { data?: { id: string }[] }).data?.map((m) => m.id) ?? [];
  } else {
    const base =
      provider === "openai" ? "https://api.openai.com/v1" : "https://api.groq.com/openai/v1";
    const res = await fetch(`${base}/models`, {
      headers: { authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) throw new Error(`${provider} ${res.status}: ${await res.text()}`);
    ids = ((await res.json()) as { data?: { id: string }[] }).data?.map((m) => m.id) ?? [];
  }
  return [...new Set(ids.filter((id) => !NON_CHAT.test(id)))].sort().reverse();
}

async function dispatch(args: CallArgs): Promise<Completion> {
  switch (args.provider) {
    case "anthropic": return callAnthropic(args);
    case "openai": return callOpenAICompat("https://api.openai.com/v1/chat/completions", args);
    case "groq": return callOpenAICompat("https://api.groq.com/openai/v1/chat/completions", args);
    case "gemini": return callGemini(args);
  }
}

export async function generateWithTask(
  taskType: AITaskType,
  systemPrompt: string,
  userPrompt: string,
  fallbackTask?: AITaskType,
  maxTokens?: number,
): Promise<string> {
  const completion = await generateWithTaskDetailed(taskType, systemPrompt, userPrompt, {
    fallbackTask,
    maxTokens,
  });
  return completion.text;
}

/**
 * `generateWithTask`, but returning the model and token counts too, and
 * taking a temperature and an abort signal — for callers that record cost
 * (the lead Analysis button).
 */
export async function generateWithTaskDetailed(
  taskType: AITaskType,
  systemPrompt: string,
  userPrompt: string,
  opts: {
    fallbackTask?: AITaskType;
    maxTokens?: number;
    temperature?: number;
    signal?: AbortSignal;
  } = {},
): Promise<Completion> {
  const { fallbackTask, maxTokens, temperature, signal } = opts;
  let taskCfg = await prisma.aITaskConfig.findUnique({ where: { taskType } });
  // Reuse a sibling task's provider when this one hasn't been assigned yet, so
  // a new task type works out of the box once any provider is configured.
  if (!taskCfg && fallbackTask) {
    taskCfg = await prisma.aITaskConfig.findUnique({
      where: { taskType: fallbackTask },
    });
  }
  if (!taskCfg) {
    throw new Error(
      `No AI provider configured for "${taskType}". Set one in Settings → AI.`,
    );
  }
  const provider = await prisma.aIProvider.findUnique({
    where: { provider: taskCfg.provider },
  });
  if (!provider || !provider.isEnabled || !provider.apiKeyEncrypted) {
    throw new Error(
      `Provider "${taskCfg.provider}" is not enabled or has no API key. Configure it in Settings → AI.`,
    );
  }
  const apiKey = decryptSecret(provider.apiKeyEncrypted);
  return dispatch({
    provider: taskCfg.provider as AIProviderId,
    model: taskCfg.model,
    apiKey,
    systemPrompt,
    userPrompt,
    maxTokens,
    temperature,
    signal,
  });
}
