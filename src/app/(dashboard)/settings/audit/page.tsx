import { auth, type ExtendedSession } from "@/lib/auth";
import { getAuditLogs } from "@/lib/actions/audit";
import AuditLogViewer from "./audit-log-viewer";

export default async function AuditLogPage() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) return null;

  if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">
          You don&apos;t have permission to view this page.
        </p>
      </div>
    );
  }

  let logs: Awaited<ReturnType<typeof getAuditLogs>>["logs"] = [];
  let total = 0;

  try {
    const result = await getAuditLogs({ limit: 25 });
    logs = result.logs;
    total = result.total;
  } catch {
    // Audit log may be empty
  }

  // Serialize dates for client component
  const serializedLogs = logs.map((log) => ({
    id: log.id,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    changes: log.changes,
    ipAddress: log.ipAddress,
    createdAt: log.createdAt.toISOString(),
    user: log.user,
  }));

  return <AuditLogViewer initialLogs={serializedLogs} initialTotal={total} />;
}
