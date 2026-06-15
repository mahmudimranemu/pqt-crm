/**
 * Activate Anthropic (Claude) as the AI provider for the CRM's AI tasks.
 *
 *   ANTHROPIC_API_KEY=sk-ant-... npx tsx scripts/activate-anthropic.ts
 *
 * Without ANTHROPIC_API_KEY it still routes the AI task to Anthropic and
 * creates the provider row, but leaves it disabled until you add the key
 * (here or via Settings → AI in the app). Run against whichever DB your
 * DATABASE_URL points at (prefix it for the local dev DB).
 */
import { PrismaClient } from "@prisma/client";

import { encryptSecret, maskApiKey } from "../src/lib/crypto";

const prisma = new PrismaClient();
const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

async function main() {
  // Route the assistant/executive AI tasks to Anthropic.
  await prisma.aITaskConfig.upsert({
    where: { taskType: "assistant_chat" },
    update: { provider: "anthropic", model: MODEL },
    create: { taskType: "assistant_chat", provider: "anthropic", model: MODEL },
  });

  const key = process.env.ANTHROPIC_API_KEY;
  if (key) {
    await prisma.aIProvider.upsert({
      where: { provider: "anthropic" },
      update: {
        apiKeyEncrypted: encryptSecret(key),
        apiKeyHint: maskApiKey(key),
        isEnabled: true,
      },
      create: {
        provider: "anthropic",
        apiKeyEncrypted: encryptSecret(key),
        apiKeyHint: maskApiKey(key),
        isEnabled: true,
      },
    });
    console.log(`✓ Anthropic ENABLED for assistant_chat (model: ${MODEL}).`);
  } else {
    await prisma.aIProvider.upsert({
      where: { provider: "anthropic" },
      update: {},
      create: { provider: "anthropic", isEnabled: false },
    });
    console.log(`• Task routed to Anthropic (model: ${MODEL}), but it's DISABLED — no key.`);
    console.log("  Add it: ANTHROPIC_API_KEY=sk-ant-... npx tsx scripts/activate-anthropic.ts");
    console.log("  …or paste your key in the app under Settings → AI.");
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
