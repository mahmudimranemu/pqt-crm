import { auth, type ExtendedSession } from "@/lib/auth";
import { Plug } from "lucide-react";
import { listApiKeys } from "@/lib/actions/api-keys";
import { ApiKeysClient } from "./api-keys-client";

export default async function IntegrationsPage() {
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

  const keys = await listApiKeys();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
          <Plug className="h-5 w-5 text-[#dc2626]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
          <p className="text-gray-500">
            API keys for external systems to read and write enquiries and leads.
          </p>
        </div>
      </div>

      <ApiKeysClient initialKeys={keys} />
    </div>
  );
}
