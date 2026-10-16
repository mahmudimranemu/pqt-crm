/**
 * Send one signed request to the CRM automation API (/api/automation/*) —
 * for testing, and as the reference for how n8n must sign its calls.
 *
 *   AUTOMATION_API_SECRET=... AUTOMATION_BASE_URL=http://localhost:3000 \
 *     npx tsx scripts/automation-request.ts GET /api/automation/agents
 *   ... POST /api/automation/qualifications '{"enquiryId":"..."}'
 *
 * Flags: --stale (timestamp 10 minutes old), --bad-sig (wrong signature).
 */
import { sign, signaturePayload } from "../src/lib/qualifier/signature";

async function main() {
  const args = process.argv.slice(2);
  const stale = args.includes("--stale");
  const badSig = args.includes("--bad-sig");
  const [method = "GET", path = "/api/automation/rules", body = ""] = args.filter((a) => !a.startsWith("--"));

  const secret = process.env.AUTOMATION_API_SECRET;
  if (!secret) throw new Error("Set AUTOMATION_API_SECRET");
  const base = process.env.AUTOMATION_BASE_URL ?? "http://localhost:3000";

  const ts = String(Math.floor(Date.now() / 1000) - (stale ? 600 : 0));
  const signature = badSig
    ? "sha256=" + "0".repeat(64)
    : sign(secret, signaturePayload(ts, method, path, body));

  const res = await fetch(base + path, {
    method,
    headers: {
      "content-type": "application/json",
      "x-pqt-timestamp": ts,
      "x-pqt-signature": signature,
    },
    body: method === "GET" ? undefined : body,
  });
  console.log(res.status);
  console.log(await res.text());
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
