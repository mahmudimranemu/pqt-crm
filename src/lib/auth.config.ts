/**
 * Type definitions for the auth session shape.
 *
 * Pre-PR-5: this file was the NextAuth `authConfig` with the credentials
 * provider, JWT/session callbacks, and signIn redirects. After PR 5 the
 * session cookie comes from PMS, so all of that lives in PMS now. We keep
 * just the types here to avoid touching the ~90 callsites that import them.
 */

import type { UserRole, Office } from "@prisma/client";

export interface ExtendedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  office: Office;
}

export interface ExtendedSession {
  user: ExtendedUser;
  expires: string;
}
