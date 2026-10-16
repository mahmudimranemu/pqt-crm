import Link from "next/link";
import { ArrowLeft, Gauge } from "lucide-react";
import { auth, type ExtendedSession } from "@/lib/auth";
import { getQualifierAdminData, type QualificationRow } from "@/lib/actions/qualifier";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AgentProfiles } from "./agent-profiles";

export const dynamic = "force-dynamic";

const TIER_STYLE: Record<string, string> = {
  hot: "bg-red-100 text-[#b91c1c]",
  warm: "bg-amber-100 text-amber-800",
  cold: "bg-sky-100 text-sky-800",
  junk: "bg-gray-100 text-gray-600",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Waiting to send",
  notified: "Sent, no decision yet",
  approved: "Suggestion approved",
  changed: "Different agent chosen",
  expired: "Expired",
};

const SOURCE_LABEL: Record<string, string> = {
  FACEBOOK_ADS: "Meta Ads",
  WEBSITE_FORM: "Website",
};

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Istanbul",
  });

/** Inquiry Qualifier: agent profiles, leave, and the latest scores. */
export default async function QualifierSettingsPage() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) return null;
  if (session.user.role !== "SUPER_ADMIN") {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">You don&apos;t have permission to view this page.</p>
      </div>
    );
  }

  const { status, agents, results } = await getQualifierAdminData();
  const running = status.enabled && status.mode !== "off";

  return (
    <div className="space-y-6">
      <Link
        href="/settings"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" /> Settings
      </Link>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
          <Gauge className="h-5 w-5 text-[#dc2626]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inquiry Qualifier</h1>
          <p className="text-gray-500">
            Scores new Meta and website inquiries and suggests an agent. A person always makes the final choice.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat
              label="Running"
              value={running ? (status.mode === "live" ? "Live" : "Shadow (record only)") : "Off"}
              tone={running ? "on" : "off"}
            />
            <Stat
              label="Inquiries from"
              value={status.startDate ? when(status.startDate) : "Not set"}
            />
            <Stat label="Scoring rules" value={status.rulesVersion ? `Version ${status.rulesVersion}` : "None"} />
            <Stat label="Automation key" value={status.secretSet ? "Set" : "Not set"} tone={status.secretSet ? "on" : "off"} />
          </div>
          <p className="text-xs text-gray-500">
            These are switched in the server settings (QUALIFIER_ENABLED, QUALIFIER_MODE, QUALIFIER_START_DATE,
            AUTOMATION_API_SECRET), not here — so nobody can turn it on by accident.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Agents</CardTitle>
          <p className="text-sm text-gray-500">
            Languages, strong countries, working hours and leave. Fill these in for everyone who should get
            suggestions, and tick who the senior consultants are.
          </p>
        </CardHeader>
        <CardContent>
          <AgentProfiles agents={agents} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Latest results</CardTitle>
          <p className="text-sm text-gray-500">The 50 most recent scores. Read-only.</p>
        </CardHeader>
        <CardContent>
          <Results rows={results} />
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "on" | "off" }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-gray-900">
        {tone && (
          <span className={`h-2 w-2 rounded-full ${tone === "on" ? "bg-green-500" : "bg-gray-300"}`} />
        )}
        {value}
      </div>
    </div>
  );
}

function Results({ rows }: { rows: QualificationRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-10 text-center text-sm text-gray-500">
        No inquiries have been scored yet.
      </div>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Inquiry</TableHead>
          <TableHead>Score</TableHead>
          <TableHead>Why</TableHead>
          <TableHead>Suggested</TableHead>
          <TableHead>Outcome</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id} className="align-top">
            <TableCell>
              <div className="font-medium text-gray-900">{r.refId ?? "—"}</div>
              <div className="text-xs text-gray-500">
                {SOURCE_LABEL[r.source] ?? r.source} · {when(r.enquiryCreatedAt)}
              </div>
              {r.mode !== "shadow" && (
                <div className="mt-1 text-xs uppercase tracking-wide text-gray-400">{r.mode}</div>
              )}
            </TableCell>
            <TableCell>
              <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold ${TIER_STYLE[r.tier] ?? TIER_STYLE.junk}`}>
                {r.score}
                <span className="capitalize">{r.tier}</span>
              </span>
              {r.isDuplicate && (
                <div className="mt-1 text-xs text-amber-700">Possible duplicate{r.duplicateOf ? ` of ${r.duplicateOf}` : ""}</div>
              )}
            </TableCell>
            <TableCell className="max-w-sm">
              {r.scoreReasons.length > 0 ? (
                <ul className="space-y-0.5 text-xs text-gray-700">
                  {r.scoreReasons.map((reason, i) => (
                    <li key={i}>{reason}</li>
                  ))}
                </ul>
              ) : (
                <span className="text-xs text-gray-400">—</span>
              )}
              {r.aiSummary && <p className="mt-2 text-xs italic text-gray-500">{r.aiSummary}</p>}
            </TableCell>
            <TableCell className="text-sm">
              {r.suggestedAgent ?? <span className="text-gray-400">None</span>}
              {r.backupAgent && <div className="text-xs text-gray-500">Backup: {r.backupAgent}</div>}
              {r.suggestionReasons.length > 0 && (
                <div className="mt-1 text-xs text-gray-500">{r.suggestionReasons.join(" · ")}</div>
              )}
            </TableCell>
            <TableCell className="text-sm">
              <div className="text-gray-900">{STATUS_LABEL[r.status] ?? r.status}</div>
              {r.finalAgent && <div className="text-xs text-gray-500">Chosen: {r.finalAgent}</div>}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
