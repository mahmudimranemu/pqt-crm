import Link from "next/link";
import { getUserClients } from "@/lib/actions/user-profile";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, ChevronLeft, ChevronRight } from "lucide-react";

const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700 border-green-200",
  INACTIVE: "bg-gray-100 text-gray-700 border-gray-200",
  LEAD: "bg-blue-100 text-blue-700 border-blue-200",
  PROSPECT: "bg-purple-100 text-purple-700 border-purple-200",
  VIP: "bg-amber-100 text-amber-700 border-amber-200",
};

interface ClientsTabProps {
  userId: string;
  page: number;
  slug: string;
}

export async function ClientsTab({ userId, page, slug }: ClientsTabProps) {
  const { clients, total, pages, currentPage } = await getUserClients(
    userId,
    page,
  );

  return (
    <Card className="border border-gray-200">
      <div className="flex items-center justify-between border-b border-gray-100 p-5">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Clients</h2>
          <p className="text-sm text-gray-500">{total} total clients assigned</p>
        </div>
      </div>
      <CardContent className="p-0">
        {clients.length === 0 ? (
          <div className="py-12 text-center">
            <Users className="mx-auto mb-4 h-12 w-12 text-gray-300" />
            <p className="text-gray-500">No clients assigned to this user.</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="border-b border-gray-100 bg-gray-50/50">
                  <TableHead className="text-xs font-medium text-gray-500">
                    Name
                  </TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">
                    Email / Phone
                  </TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">
                    Nationality
                  </TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">
                    Status
                  </TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">
                    Source
                  </TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">
                    Date
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow
                    key={client.id}
                    className="border-b border-gray-50 hover:bg-gray-50/50"
                  >
                    <TableCell>
                      <Link
                        href={`/clients/${client.id}`}
                        className="text-sm font-medium text-gray-900 hover:text-[#dc2626]"
                      >
                        {client.firstName} {client.lastName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5 text-sm text-gray-600">
                        <div>{client.email}</div>
                        <div className="text-gray-400">{client.phone || "—"}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {client.nationality || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`${statusColors[client.status] || "bg-gray-100 text-gray-700"} hover:bg-opacity-80`}
                      >
                        {client.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {client.source?.replace(/_/g, " ") || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {new Date(client.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {pages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3">
                <p className="text-sm text-gray-500">
                  Page {currentPage} of {pages} ({total} results)
                </p>
                <div className="flex gap-2">
                  {currentPage > 1 && (
                    <Link
                      href={`/users/${slug}?tab=clients&page=${currentPage - 1}`}
                      className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
                    >
                      <ChevronLeft className="h-4 w-4" /> Previous
                    </Link>
                  )}
                  {currentPage < pages && (
                    <Link
                      href={`/users/${slug}?tab=clients&page=${currentPage + 1}`}
                      className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
                    >
                      Next <ChevronRight className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
