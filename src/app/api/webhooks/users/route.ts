import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import type { Office, UserRole } from "@prisma/client";

/**
 * Inbound user-event webhook from the PMS (the identity authority).
 *
 *   PR 3 — log-only mode (WEBHOOK_USERS_WRITE_ENABLED!=true)
 *   PR 4 — write mode  (WEBHOOK_USERS_WRITE_ENABLED=true) UPSERTs the mirror
 *
 * Headers expected from PMS (see app/services/webhook_signing.py):
 *   X-PQT-Event:     user.created | user.updated | user.deactivated
 *   X-PQT-Timestamp: unix seconds (rejected if older than 5 minutes)
 *   X-PQT-Signature: sha256=<hex hmac-sha256 of raw body>
 *
 * Two feature flags:
 *   WEBHOOK_USERS_ENABLED=true       → route is reachable (404s otherwise)
 *   WEBHOOK_USERS_WRITE_ENABLED=true → route writes to DB (log-only otherwise)
 *
 * Shared secret:
 *   WEBHOOK_USERS_SHARED_SECRET — must match the PMS value byte-for-byte.
 */

const REPLAY_WINDOW_SECONDS = 300; // 5 min
const ALLOWED_EVENTS = new Set([
  "user.created",
  "user.updated",
  "user.deactivated",
]);

// CRM Office UUIDs are seeded in PMS (offices table) using uuid5(NAMESPACE_DNS,
// "office-<CRM_ENUM>.pqt.propertyquestturkey.com"). PMS sends office_id as a
// UUID, so we reverse-map back to the CRM enum value the mirror table needs.
const PMS_OFFICE_ID_TO_CRM_ENUM: Record<string, Office> = {
  // Generated from uuid5(NAMESPACE_DNS, 'office-<X>.pqt.propertyquestturkey.com').
  // Keep in lock-step with scripts/migrate_crm_users_to_pms.py:_office_uuid().
  "afcf8bde-720d-5dba-a443-090763700e5d": "HEAD_OFFICE",
  "e91e73d6-2d02-5ad2-b8d0-c56e3f40f178": "TURKEY",
  "eb93f944-d356-575a-becb-741f4417ecf8": "UAE",
  "b6c67e75-a3ba-5d86-97cb-39bb4f563f46": "UK",
  "53e831ab-7beb-58c3-be41-82c46c3cc070": "MALAYSIA",
  "96395261-b87a-5169-b728-894f882fef69": "BANGLADESH",
};

// PMS lowercase role → CRM uppercase enum.
const PMS_ROLE_TO_CRM: Record<string, UserRole> = {
  super_admin: "SUPER_ADMIN",
  admin: "ADMIN",
  sales_manager: "SALES_MANAGER",
  sales_agent: "SALES_AGENT",
  viewer: "VIEWER",
  // PMS-only roles fall back to VIEWER for the CRM mirror — they shouldn't be
  // logging into CRM anyway, and VIEWER is the safest default.
  portfolio_manager: "VIEWER",
  after_sales: "VIEWER",
  developer: "VIEWER",
  partner_agent: "VIEWER",
};

function constantTimeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

type PmsUserPayload = {
  id: string;
  email: string;
  full_name?: string;
  role?: string;
  is_active?: boolean;
  office_id?: string | null;
  department?: string | null;
};

function splitFullName(full: string): { firstName: string; lastName: string } {
  const trimmed = (full ?? "").trim().replace(/\s+/g, " ");
  if (!trimmed) return { firstName: "", lastName: "" };
  const [first, ...rest] = trimmed.split(" ");
  return { firstName: first, lastName: rest.join(" ") };
}

async function applyEvent(event: string, user: PmsUserPayload): Promise<void> {
  const role = user.role ? PMS_ROLE_TO_CRM[user.role] ?? "VIEWER" : "VIEWER";
  const office: Office =
    (user.office_id && PMS_OFFICE_ID_TO_CRM_ENUM[user.office_id]) || "HEAD_OFFICE";

  if (event === "user.deactivated") {
    // Just flip is_active. The user may not have a row yet (e.g. PMS deactivated
    // before any user.created arrived); UPSERT for safety.
    await prisma.user.updateMany({
      where: { id: user.id },
      data: { isActive: false, syncedAt: new Date() },
    });
    return;
  }

  // user.created and user.updated are both UPSERT.
  const { firstName, lastName } = splitFullName(user.full_name ?? "");
  await prisma.user.upsert({
    where: { id: user.id },
    create: {
      id: user.id,
      email: user.email.toLowerCase(),
      // Mirror users authenticate via the PMS cookie (PR 5 onward). Until then
      // NextAuth still queries the password field — set a value that bcrypt
      // verify can NEVER match so the user MUST go through PMS to log in.
      password: "MIRROR_NO_LOCAL_LOGIN",
      firstName: firstName || user.email,
      lastName: lastName || "",
      role,
      office,
      isActive: user.is_active ?? true,
      syncedAt: new Date(),
    },
    update: {
      email: user.email.toLowerCase(),
      firstName: firstName || user.email,
      lastName: lastName || "",
      role,
      office,
      isActive: user.is_active ?? true,
      syncedAt: new Date(),
    },
  });
}

export async function POST(request: NextRequest) {
  if (process.env.WEBHOOK_USERS_ENABLED !== "true") {
    return new NextResponse("Not Found", { status: 404 });
  }

  const secret = process.env.WEBHOOK_USERS_SHARED_SECRET;
  if (!secret) {
    console.error("[users webhook] WEBHOOK_USERS_SHARED_SECRET unset");
    return new NextResponse("server misconfigured", { status: 500 });
  }

  const raw = await request.text();
  const sig = request.headers.get("x-pqt-signature") ?? "";
  const ts = request.headers.get("x-pqt-timestamp") ?? "0";
  const event = request.headers.get("x-pqt-event") ?? "";

  const tsNum = parseInt(ts, 10);
  if (!Number.isFinite(tsNum) || tsNum <= 0) {
    return new NextResponse("missing timestamp", { status: 401 });
  }
  const age = Math.floor(Date.now() / 1000) - tsNum;
  if (Math.abs(age) > REPLAY_WINDOW_SECONDS) {
    return new NextResponse("stale", { status: 401 });
  }

  const expected =
    "sha256=" +
    crypto.createHmac("sha256", secret).update(raw).digest("hex");
  if (!constantTimeEqual(sig, expected)) {
    return new NextResponse("bad signature", { status: 401 });
  }

  if (!ALLOWED_EVENTS.has(event)) {
    return new NextResponse(`unknown event: ${event}`, { status: 400 });
  }

  let body: { event: string; user: PmsUserPayload };
  try {
    body = JSON.parse(raw);
  } catch {
    return new NextResponse("invalid json", { status: 400 });
  }

  if (process.env.WEBHOOK_USERS_WRITE_ENABLED === "true") {
    try {
      await applyEvent(event, body.user);
      console.log("[users webhook applied]", {
        event,
        user_id: body.user?.id,
        email: body.user?.email,
      });
    } catch (err) {
      console.error("[users webhook write error]", err);
      return new NextResponse("write failed", { status: 500 });
    }
  } else {
    console.log("[users webhook log-only]", {
      event,
      user_id: body.user?.id,
      email: body.user?.email,
      role: body.user?.role,
      is_active: body.user?.is_active,
    });
  }

  return NextResponse.json({ received: true, event });
}

// GET is a liveness probe.
export async function GET() {
  if (process.env.WEBHOOK_USERS_ENABLED !== "true") {
    return new NextResponse("Not Found", { status: 404 });
  }
  return NextResponse.json({
    ok: true,
    feature: "webhook_users",
    write_mode: process.env.WEBHOOK_USERS_WRITE_ENABLED === "true",
  });
}
