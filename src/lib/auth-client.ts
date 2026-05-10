/**
 * Client-safe auth helpers (no `next/headers` import).
 *
 * `signOut` and `signInUrl` are usable from client components. The
 * server-side `auth()` lives in `./auth.ts` and reads cookies via
 * `next/headers` — that file MUST NOT be imported from a client component
 * (Next.js will refuse to compile it).
 */

function pmsBaseUrl(): string {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_PMS_LOGIN_URL) {
    return process.env.NEXT_PUBLIC_PMS_LOGIN_URL;
  }
  // Falls back to the parent-domain login URL in prod-like deployments.
  return "https://pms.propertyquestturkey.com";
}

/** Programmatic sign-out: hit PMS logout (which clears the parent-domain
 *  cookies) and bounce to PMS login. */
export async function signOut(opts?: { callbackUrl?: string }): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await fetch(`${pmsBaseUrl()}/api/v1/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    /* fall through to redirect */
  }
  window.location.href = opts?.callbackUrl ?? `${pmsBaseUrl()}/login`;
}

/** Build a redirect-to-login URL with optional `?redirect=` parameter. */
export function signInUrl(redirectTo?: string): string {
  const base = `${pmsBaseUrl()}/login`;
  if (!redirectTo) return base;
  const u = new URL(base);
  u.searchParams.set("redirect", redirectTo);
  return u.toString();
}
