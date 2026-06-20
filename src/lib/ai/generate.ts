import prisma from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";

export type AIProviderId = "anthropic" | "openai" | "gemini" | "groq";
export type AITaskType =
  | "whatsapp_generation"
  | "email_generation"
  | "assistant_chat"
  | "client_profile";

export const AI_PROVIDERS: { id: AIProviderId; label: string; defaultModel: string }[] = [
  { id: "anthropic", label: "Anthropic (Claude)", defaultModel: "claude-haiku-4-5-20251001" },
  { id: "openai", label: "OpenAI", defaultModel: "gpt-4o-mini" },
  { id: "gemini", label: "Google Gemini", defaultModel: "gemini-1.5-flash" },
  { id: "groq", label: "Groq", defaultModel: "llama-3.3-70b-versatile" },
];

export const AI_TASKS: { id: AITaskType; label: string }[] = [
  { id: "whatsapp_generation", label: "WhatsApp message generation" },
  { id: "email_generation", label: "Email generation" },
  { id: "assistant_chat", label: "Assistant chat (intent extraction)" },
  { id: "client_profile", label: "Client profile generation" },
];

interface CallArgs {
  provider: AIProviderId;
  model: string;
  apiKey: string;
  systemPrompt: string;
  userPrompt: string;
  /** Output token cap. Defaults to 1024 — raise for large structured outputs. */
  maxTokens?: number;
}

async function callAnthropic({ model, apiKey, systemPrompt, userPrompt, maxTokens }: CallArgs): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens ?? 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.content?.[0]?.text ?? "";
}

async function callOpenAICompat(url: string, { model, apiKey, systemPrompt, userPrompt, maxTokens }: CallArgs): Promise<string> {
  const res = await fetch(url, {
    method: "POST",
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
      temperature: 0.7,
      max_tokens: maxTokens ?? 1024,
    }),
  });
  if (!res.ok) throw new Error(`${url} ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function callGemini({ model, apiKey, systemPrompt, userPrompt, maxTokens }: CallArgs): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: { maxOutputTokens: maxTokens ?? 1024 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
}

async function dispatch(args: CallArgs): Promise<string> {
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
  });
}
