import { auth, type ExtendedSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getMyAuditLogs } from "@/lib/actions/audit";
import { Activity, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

const actionColors: Record<string, string> = {
  CREATE: "bg-green-100 text-green-700",
  UPDATE: "bg-blue-100 text-blue-700",
  DELETE: "bg-red-100 text-red-700",
  LOGIN: "bg-purple-100 text-purple-700",
  LOGOUT: "bg-gray-100 text-gray-700",
  EXPORT: "bg-amber-100 text-amber-700",
  IMPORT: "bg-teal-100 text-teal-700",
  ASSIGN: "bg-indigo-100 text-indigo-700",
  STAGE_CHANGE: "bg-orange-100 text-orange-700",
};

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function ActivityPage({ searchParams }: PageProps) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const currentPage = params.page ? parseInt(params.page) : 1;

  let logs: Awaited<ReturnType<typeof getMyAuditLogs>>["logs"] = [];
  let total = 0;

  try {
    const result = await getMyAuditLogs({ page: currentPage, limit: 30 });
    logs = result.logs;
    total = result.total;
  } catch {
    // May be empty
  }

  const totalPages = Math.ceil(total / 30);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
          <Activity className="h-5 w-5 text-[#dc2626]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Activity</h1>
          <p className="text-gray-500">Your recent actions and changes</p>
        </div>
      </div>

      <Card className="border border-gray-200">
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <div className="py-16 text-center">
              <Activity className="mx-auto mb-3 h-10 w-10 text-gray-300" />
              <p className="text-gray-500">No activity yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50"
                >
                  <Badge
                    className={`mt-0.5 shrink-0 text-[10px] font-semibold ${actionColors[log.action] || "bg-gray-100 text-gray-700"}`}
                  >
                    {log.action.replace(/_/g, " ")}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{log.entityType}</span>
                      {(() => {
                        const changes = log.changes as Record<string, unknown> | null;
                        if (changes?.summary) {
                          return (
                            <span className="text-gray-500">
                              {" "}&mdash; {String(changes.summary)}
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {new Date(log.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3">
              <p className="text-xs text-gray-500">
                Page {currentPage} of {totalPages} ({total} total)
              </p>
              <div className="flex gap-1">
                {currentPage > 1 && (
                  <Link
                    href={`/activity?page=${currentPage - 1}`}
                    className="rounded border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Link>
                )}
                {currentPage < totalPages && (
                  <Link
                    href={`/activity?page=${currentPage + 1}`}
                    className="rounded border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
