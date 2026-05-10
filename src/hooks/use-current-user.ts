"use client";

import { useEffect, useState } from "react";
import type { ExtendedUser } from "@/lib/auth.config";

type State = {
  data: ExtendedUser | null;
  loading: boolean;
  error: Error | null;
};

/** Fetches the current user from /api/me. Used by client components that
 *  need session data at render time (e.g. role-based button visibility).
 *  The server-side `auth()` helper is preferred wherever possible.
 */
export function useCurrentUser(): State {
  const [state, setState] = useState<State>({ data: null, loading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: ExtendedUser) => {
        if (!cancelled) setState({ data: d, loading: false, error: null });
      })
      .catch((e: Error) => {
        if (!cancelled) setState({ data: null, loading: false, error: e });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
