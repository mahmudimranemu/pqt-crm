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

// PMS backend API base, e.g. https://api.propertyquestturkey.com/api/v1.
// The middleware calls POST {PMS_API_URL}/auth/refresh to mint a fresh
// access cookie from the refresh cookie — mirroring the PMS axios
// interceptor so the CRM keeps the session alive instead of bouncing the
// user back to PMS /welcome every 15 minutes.
const PMS_API_URL =
  process.env.PMS_API_URL ?? "http://localhost:8000/api/v1";

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

/** Pull the `name=value` out of a Set-Cookie string (drops attributes). */
function cookiePair(setCookie: string): [string, string] | null {
  const first = setCookie.split(";", 1)[0];
  const eq = first.indexOf("=");
  if (eq === -1) return null;
  return [first.slice(0, eq).trim(), first.slice(eq + 1).trim()];
}

type RefreshResult = {
  /** Raw Set-Cookie strings from the backend, to relay to the browser. */
  setCookies: string[];
  /** Rebuilt Cookie header (incoming cookies + new access/refresh) so the
   *  downstream page's `auth()` sees the fresh access token on THIS request. */
  cookieHeader: string;
};

/**
 * Exchange the refresh cookie for a fresh access cookie via the PMS backend.
 * Returns null on any failure (network, 401, missing Set-Cookie).
 */
async function tryRefresh(request: NextRequest): Promise<RefreshResult | null> {
  const incomingCookie = request.headers.get("cookie") ?? "";
  if (!incomingCookie.includes(`${REFRESH_COOKIE}=`)) return null;

  try {
    const res = await fetch(`${PMS_API_URL}/auth/refresh`, {
      method: "POST",
      headers: { cookie: incomingCookie },
      cache: "no-store",
    });
    if (!res.ok) return null;

    const setCookies = res.headers.getSetCookie?.() ?? [];
    if (setCookies.length === 0) return null;

    // Seed a jar from the incoming cookies, then overwrite with the new
    // access/refresh values so the forwarded request carries the fresh token.
    const jar = new Map<string, string>();
    for (const part of incomingCookie.split(";")) {
      const eq = part.indexOf("=");
      if (eq > -1) jar.set(part.slice(0, eq).trim(), part.slice(eq + 1).trim());
    }
    let sawAccess = false;
    for (const sc of setCookies) {
      const pair = cookiePair(sc);
      if (!pair) continue;
      jar.set(pair[0], pair[1]);
      if (pair[0] === ACCESS_COOKIE) sawAccess = true;
    }
    if (!sawAccess) return null;

    const cookieHeader = Array.from(jar.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
    return { setCookies, cookieHeader };
  } catch {
    return null;
  }
}

function withSecurityHeaders(res: NextResponse): NextResponse {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.headers.set(k, v);
  return res;
}

/**
 * True for link prefetches / speculative loads. The backend rotates the
 * refresh token on every /auth/refresh and treats replay of a rotated token
 * as theft — revoking ALL of the user's tokens. So we must NOT fire a refresh
 * for prefetches, which can race the real navigation with the same stale
 * cookie. Prefetches just pass through; the real click refreshes once.
 */
function isPrefetch(request: NextRequest): boolean {
  return (
    request.headers.get("next-router-prefetch") != null ||
    request.headers.get("purpose") === "prefetch" ||
    (request.headers.get("sec-purpose")?.includes("prefetch") ?? false)
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Public paths bypass auth, but still get security headers.
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return withSecurityHeaders(NextResponse.next());
  }

  // 2. Old NextAuth pages — redirect to PMS, preserve the redirect target.
  if (LEGACY_AUTH_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(pmsLoginUrl(`https://${request.nextUrl.host}/dashboard`));
  }

  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  const loginRedirect = `${request.nextUrl.origin}${pathname}${request.nextUrl.search}`;

  // 3. No cookies at all → genuinely logged out.
  if (!accessToken && !refreshToken) {
    return NextResponse.redirect(pmsLoginUrl(loginRedirect));
  }

  // 4. Happy path: a valid access token admits immediately.
  if (accessToken && (await isAccessTokenValid(accessToken))) {
    return withSecurityHeaders(NextResponse.next());
  }

  // 5. Access token missing or expired, but a refresh cookie exists. The PMS
  //    frontend handles this transparently via its axios 401 interceptor; the
  //    CRM has no such client, so do the exchange here — but ONLY for real
  //    navigations (never prefetches, to avoid racing the refresh-token
  //    rotation). On success we both:
  //      (a) relay the new Set-Cookie to the browser (future requests), and
  //      (b) forward the refreshed Cookie header to the page so `auth()`
  //          succeeds on THIS request — no bounce, no /welcome round-trip.
  if (refreshToken && !isPrefetch(request)) {
    const refreshed = await tryRefresh(request);
    if (refreshed) {
      const reqHeaders = new Headers(request.headers);
      reqHeaders.set("cookie", refreshed.cookieHeader);
      const res = NextResponse.next({ request: { headers: reqHeaders } });
      for (const sc of refreshed.setCookies) res.headers.append("set-cookie", sc);
      return withSecurityHeaders(res);
    }
  }

  // 6. Prefetch with a stale access token: don't refresh (rotation race) and
  //    don't redirect a speculative request to PMS — just pass it through.
  //    The user's real click will hit case 5 and refresh once.
  if (isPrefetch(request)) {
    return withSecurityHeaders(NextResponse.next());
  }

  // 7. Refresh unavailable or failed → send to PMS login.
  return NextResponse.redirect(pmsLoginUrl(loginRedirect));
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
