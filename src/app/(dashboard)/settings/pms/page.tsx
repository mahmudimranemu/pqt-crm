import { auth, type ExtendedSession } from "@/lib/auth";
import { Building2 } from "lucide-react";
import { getPmsIntegration } from "@/lib/actions/pms-integration";
import { PmsSettingsClient } from "./pms-settings-client";

export default async function PmsSettingsPage() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) return null;

  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN") {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">
          You don&apos;t have permission to view this page.
        </p>
      </div>
    );
  }

  const data = await getPmsIntegration();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
          <Building2 className="h-5 w-5 text-[#dc2626]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">PMS Properties</h1>
          <p className="text-gray-500">
            Connect the CRM to the PMS so the Properties page shows live PMS
            listings instead of the website catalog.
          </p>
        </div>
      </div>

      <PmsSettingsClient initial={data} />
    </div>
  );
}
