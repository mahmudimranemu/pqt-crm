import { auth, type ExtendedSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getPools, getUsersForAccess } from "@/lib/actions/crm-settings";
import { SlidersHorizontal } from "lucide-react";
import { PoolManager } from "./pool-manager";

export default async function CrmSettingsPage() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  const [pools, users] = await Promise.all([getPools(), getUsersForAccess()]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <SlidersHorizontal className="h-6 w-6 text-[#dc2626]" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CRM Settings</h1>
          <p className="text-sm text-gray-500">
            Manage pools, access control, and system configuration
          </p>
        </div>
      </div>

      <PoolManager initialPools={pools} users={users} />
    </div>
  );
}
