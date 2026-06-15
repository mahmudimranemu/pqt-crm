import { redirect } from "next/navigation";

import { getExecutiveData } from "@/lib/actions/executive";
import { auth, type ExtendedSession } from "@/lib/auth";

import ExecutiveDashboard from "./executive-dashboard";

/**
 * Executive (CEO / Super-Admin) dashboard — a single-screen overview of the
 * whole CRM. Restricted to top management. Phase 0 renders the design with
 * placeholder data; Phase 1 wires it to live CRM aggregates.
 */
export default async function ExecutiveDashboardPage() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) return null;

  const role = session.user.role;
  if (role !== "SUPER_ADMIN" && role !== "ADMIN") {
    redirect("/dashboard");
  }

  // Live aggregates; fall back to the design's placeholder data on any error
  // so the page always renders.
  let data;
  try {
    data = await getExecutiveData();
  } catch {
    data = undefined;
  }

  return <ExecutiveDashboard data={data} />;
}
