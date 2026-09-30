import Link from "next/link";
import { ArrowLeft, ScanSearch } from "lucide-react";
import { auth, type ExtendedSession } from "@/lib/auth";
import { getLeadAnalysisUsage } from "@/lib/actions/lead-analysis";
import { ANALYSIS_LIMITS } from "@/lib/ai/lead-analysis-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AnalysisAccessSwitch } from "./access-switch";

const usd = (n: number) => `$${n < 1 ? n.toFixed(4) : n.toFixed(2)}`;
const int = (n: number) => n.toLocaleString("en-GB");

/** Lead Analysis: who may use it, and what it has cost this month. */
export default async function LeadAnalysisSettingsPage() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) return null;
  if (session.user.role !== "SUPER_ADMIN") {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">You don&apos;t have permission to view this page.</p>
      </div>
    );
  }

  const usage = await getLeadAnalysisUsage();

  return (
    <div className="space-y-6">
      <Link
        href="/settings/ai"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" /> AI Providers
      </Link>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
          <ScanSearch className="h-5 w-5 text-[#dc2626]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lead Analysis</h1>
          <p className="text-gray-500">
            Who can use the Analysis button on lead pages, and what it costs.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Who can use it</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <AnalysisAccessSwitch initial={usage.access} />
          <p className="text-xs text-gray-500">
            Limits: {ANALYSIS_LIMITS.perUserPerHour} analyses per person per hour; the same
            lead again within 2 minutes shows the saved result.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">This month</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Analyses" value={int(usage.month.runs)} />
            <Stat label="Failed" value={int(usage.month.failed)} />
            <Stat
              label="Tokens (in / out)"
              value={`${int(usage.month.inputTokens)} / ${int(usage.month.outputTokens)}`}
            />
            <Stat label="Estimated cost" value={usd(usage.month.costUsd)} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-gray-700">Per day</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Day</TableHead>
                    <TableHead className="text-right">Analyses</TableHead>
                    <TableHead className="text-right">Tokens</TableHead>
                    <TableHead className="text-right">Est. cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usage.byDay.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-gray-500">
                        No analyses yet this month.
                      </TableCell>
                    </TableRow>
                  )}
                  {usage.byDay.map((d) => (
                    <TableRow key={d.day}>
                      <TableCell>{d.day}</TableCell>
                      <TableCell className="text-right">
                        {d.runs}
                        {d.failed ? <span className="text-gray-400"> ({d.failed} failed)</span> : null}
                      </TableCell>
                      <TableCell className="text-right">{int(d.tokens)}</TableCell>
                      <TableCell className="text-right">{usd(d.costUsd)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-gray-700">Per person</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Analyses</TableHead>
                    <TableHead className="text-right">Tokens</TableHead>
                    <TableHead className="text-right">Est. cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usage.byUser.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-gray-500">
                        No analyses yet this month.
                      </TableCell>
                    </TableRow>
                  )}
                  {usage.byUser.map((u) => (
                    <TableRow key={u.name}>
                      <TableCell>{u.name}</TableCell>
                      <TableCell className="text-right">{u.runs}</TableCell>
                      <TableCell className="text-right">{int(u.tokens)}</TableCell>
                      <TableCell className="text-right">{usd(u.costUsd)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Cost is an estimate from approximate list prices per model (in
            src/lib/ai/lead-analysis-config.ts) — check your provider&apos;s bill for the real figure.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-gray-900">{value}</div>
    </div>
  );
}
