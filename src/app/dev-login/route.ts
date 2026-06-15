import { SignJWT } from "jose";
import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * DEV-ONLY login shortcut. The CRM normally has no login of its own — it reads
 * the shared `pqt_access` cookie the PMS sets at sign-in (SSO). For local,
 * PMS-free development this mints that exact cookie for a seeded user so you
 * can use the CRM standalone.
 *
 *   GET /dev-login                  → logs in as admin@pqt.com (super admin)
 *   GET /dev-login?email=foo@bar    → logs in as that user
 *
 * Returns 404 in production.
 */
function isLocalhost(req: Request): boolean {
  const host = new URL(req.url).hostname;
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host === "0.0.0.0"
  );
}

export async function GET(req: Request) {
  // Hard gate: dev builds AND localhost only — never reachable in production
  // or over a network host.
  if (process.env.NODE_ENV === "production" || !isLocalhost(req)) {
    return new NextResponse("Not found", { status: 404 });
  }
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return new NextResponse("JWT_SECRET is not set in .env", { status: 500 });
  }

  const email = new URL(req.url).searchParams.get("email") ?? "admin@pqt.com";
  const user = await prisma.user.findFirst({
    where: { email },
    select: { id: true, email: true, role: true },
  });
  if (!user) {
    return new NextResponse(
      `No user "${email}" in this database. Seed it first (npm run db:seed).`,
      { status: 404 },
    );
  }

  // Mint a token shaped exactly like the PMS's access JWT (see verifyAccessCookie).
  const token = await new SignJWT({ type: "access", email: user.email, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuer("pms.propertyquestturkey.com")
    .setAudience("crm")
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(new TextEncoder().encode(secret));

  const res = NextResponse.redirect(new URL("/dashboard", req.url));
  res.cookies.set("pqt_access", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return res;
}
