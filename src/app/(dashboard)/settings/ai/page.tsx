import { auth, type ExtendedSession } from "@/lib/auth";
import { Sparkles } from "lucide-react";
import { getAISettings } from "@/lib/actions/ai-settings";
import { AISettingsClient } from "./ai-settings-client";

export default async function AISettingsPage() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) return null;

  if (session.user.role !== "SUPER_ADMIN") {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">
          You don&apos;t have permission to view this page.
        </p>
      </div>
    );
  }

  const data = await getAISettings();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
          <Sparkles className="h-5 w-5 text-[#dc2626]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Providers</h1>
          <p className="text-gray-500">
            Configure API keys and assign models to specific tasks.
          </p>
        </div>
      </div>

      <AISettingsClient initialData={data} />
    </div>
  );
}
