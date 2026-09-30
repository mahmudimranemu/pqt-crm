import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import prisma from "@/lib/prisma";
import { auth, type ExtendedSession } from "@/lib/auth";
import { buildLeadSnapshot } from "@/lib/ai/lead-snapshot";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Debug view for the lead Analysis button: the exact snapshot that would be
 * sent to the AI for this lead, so what leaves the CRM can be checked.
 * Super Admin only (the CRM's stand-in for `crm.admin.ai`).
 */
export default async function LeadAnalysisSnapshotPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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

  const { id } = await params;
  // The URL may carry the lead's id or its reference ("PQT-L-0256").
  const lead = await prisma.lead.findFirst({
    where: { OR: [{ id }, { leadNumber: id }] },
    select: { id: true, leadNumber: true },
  });
  if (!lead) {
    return <p className="py-12 text-center text-gray-500">Lead not found.</p>;
  }

  const { snapshot, dataAsOf, fingerprint, counts } = await buildLeadSnapshot(lead.id);

  return (
    <div className="space-y-4">
      <Link
        href={`/leads/${lead.id}`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back to lead
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#dc2626]" />
            AI Analysis snapshot · {lead.leadNumber}
          </CardTitle>
          <p className="text-xs text-gray-500">
            Exactly what the Analysis button sends to the AI provider. Phone numbers,
            email addresses and the client&apos;s name are removed. {counts.notes} notes ·{" "}
            {counts.activities} activities · data as of {dataAsOf.toISOString()} ·
            fingerprint <code>{fingerprint.slice(0, 12)}</code>
          </p>
        </CardHeader>
        <CardContent>
          <pre className="max-h-[70vh] overflow-auto rounded-md bg-gray-50 p-4 text-xs leading-relaxed text-gray-800">
            {JSON.stringify(snapshot, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
