import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import prisma from "@/lib/prisma";

export const API_SCOPES = [
  "enquiries:read",
  "enquiries:write",
  "leads:read",
  "leads:write",
  "clients:read",
  "clients:write",
] as const;
export type ApiScope = (typeof API_SCOPES)[number];

const KEY_PREFIX = "pqt_";

export function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const raw = `${KEY_PREFIX}${randomBytes(32).toString("base64url")}`;
  const hash = hashApiKey(raw);
  const prefix = raw.slice(0, 12);
  return { raw, hash, prefix };
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export interface AuthedApiKey {
  id: string;
  scopes: string[];
  createdById: string;
}

export async function authenticateRequest(
  req: NextRequest,
): Promise<AuthedApiKey | null> {
  const header = req.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const token = match[1].trim();
  if (!token.startsWith(KEY_PREFIX)) return null;

  const hash = hashApiKey(token);
  const row = await prisma.apiKey.findUnique({ where: { keyHash: hash } });
  if (!row || !row.isActive) return null;

  // Fire-and-forget update; don't block response on it.
  void prisma.apiKey
    .update({ where: { id: row.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return { id: row.id, scopes: row.scopes, createdById: row.createdById };
}

export type ApiHandler<C = Record<string, never>> = (
  req: NextRequest,
  ctx: { auth: AuthedApiKey; params: C },
) => Promise<NextResponse> | NextResponse;

export function withApiAuth<C = Record<string, never>>(
  scope: ApiScope,
  handler: ApiHandler<C>,
) {
  return async (req: NextRequest, ctx: { params: Promise<C> }) => {
    const auth = await authenticateRequest(req);
    if (!auth) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Missing or invalid API key" } },
        { status: 401 },
      );
    }
    if (!auth.scopes.includes(scope)) {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: `API key lacks required scope: ${scope}`,
          },
        },
        { status: 403 },
      );
    }

    try {
      const params = await ctx.params;
      return await handler(req, { auth, params });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Internal server error";
      const status = /not found/i.test(message)
        ? 404
        : /required|invalid|must be/i.test(message)
          ? 400
          : 500;
      return NextResponse.json(
        {
          error: {
            code:
              status === 404
                ? "NOT_FOUND"
                : status === 400
                  ? "BAD_REQUEST"
                  : "INTERNAL_ERROR",
            message,
          },
        },
        { status },
      );
    }
  };
}
