import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SECURITY_HEADERS: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-XSS-Protection": "1; mode=block",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
};

const ACCESS_COOKIE = "pqt_access";
const REFRESH_COOKIE = "pqt_refresh";

/* Routes the proxy should let through unconditionally. /api/* routes do
 * their own auth via the `auth()` helper and should return real status codes
 * (401, 403) instead of being redirected to PMS — XHR clients can't follow
 * an HTML redirect chain sensibly. Webhook/sync paths use signature/secret
 * gating, not session cookies, so they were always proxy-public. */
const PUBLIC_PATHS = [
  "/api/",
  "/_next/",
  "/favicon.ico",
];

/* Optional: legacy auth-flow paths now that NextAuth is gone. We redirect any
 * traffic to /login or /forgot-password etc. straight to PMS. */
const LEGACY_AUTH_PATHS = ["/login", "/forgot-password", "/reset-password"];

function pmsLoginUrl(redirectTo: string): string {
  const base = process.env.PMS_LOGIN_URL ?? "https://pms.propertyquestturkey.com";
  const u = new URL(`${base}/login`);
  u.searchParams.set("redirect", redirectTo);
  return u.toString();
}

async function isAccessTokenValid(token: string): Promise<boolean> {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    // Fail closed: without a verification key we cannot trust anything.
    return false;
  }
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
      { issuer: "pms.propertyquestturkey.com", audience: "crm" }
    );
    return payload.type === "access" && typeof payload.sub === "string";
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Public paths bypass auth, but still get security headers.
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    const r = NextResponse.next();
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) r.headers.set(k, v);
    return r;
  }

  // 2. Old NextAuth pages — redirect to PMS, preserve the redirect target.
  if (LEGACY_AUTH_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(pmsLoginUrl(`https://${request.nextUrl.host}/dashboard`));
  }

  // 3. Auth gate. A live access cookie is sufficient to admit; the access
  //    token verification happens in `auth()` for the actual session lookup.
  //    A refresh-only cookie is also acceptable — the page will fetch the
  //    user via `auth()`, fail, and the app will trigger a refresh on first
  //    XHR. Refresh handling lives on the API side.
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  const hasAnyAuthCookie = Boolean(accessToken || refreshToken);

  if (!hasAnyAuthCookie) {
    return NextResponse.redirect(
      pmsLoginUrl(`${request.nextUrl.origin}${pathname}${request.nextUrl.search}`)
    );
  }

  // If we have an access cookie, sanity-check it. A failed verify means the
  // token was tampered with or signed with a different key — bounce to login.
  if (accessToken && !(await isAccessTokenValid(accessToken))) {
    return NextResponse.redirect(
      pmsLoginUrl(`${request.nextUrl.origin}${pathname}${request.nextUrl.search}`)
    );
  }

  const r = NextResponse.next();
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) r.headers.set(k, v);
  return r;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
