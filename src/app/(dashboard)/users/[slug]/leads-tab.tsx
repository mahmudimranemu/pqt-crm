import Link from "next/link";
import { getUserLeads } from "@/lib/actions/user-profile";
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
import { Target, ChevronLeft, ChevronRight } from "lucide-react";

const stageColors: Record<string, string> = {
  NEW_ENQUIRY: "bg-blue-100 text-blue-700",
  CONTACTED: "bg-yellow-100 text-yellow-700",
  QUALIFIED: "bg-purple-100 text-purple-700",
  VIEWING_ARRANGED: "bg-indigo-100 text-indigo-700",
  VIEWED: "bg-cyan-100 text-cyan-700",
  OFFER_MADE: "bg-orange-100 text-orange-700",
  NEGOTIATING: "bg-amber-100 text-amber-700",
  WON: "bg-green-100 text-green-700",
  LOST: "bg-red-100 text-red-700",
};

interface LeadsTabProps {
  userId: string;
  page: number;
  slug: string;
}

export async function LeadsTab({ userId, page, slug }: LeadsTabProps) {
  const { leads, total, pages, currentPage } = await getUserLeads(userId, page);

  return (
    <Card className="border border-gray-200">
      <div className="flex items-center justify-between border-b border-gray-100 p-5">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Leads</h2>
          <p className="text-sm text-gray-500">{total} total leads owned</p>
        </div>
      </div>
      <CardContent className="p-0">
        {leads.length === 0 ? (
          <div className="py-12 text-center">
            <Target className="mx-auto mb-4 h-12 w-12 text-gray-300" />
            <p className="text-gray-500">No leads assigned to this user.</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="border-b border-gray-100 bg-gray-50/50">
                  <TableHead className="text-xs font-medium text-gray-500">
                    Lead
                  </TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">
                    Client
                  </TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">
                    Stage
                  </TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">
                    Value
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
                {leads.map((lead) => (
                  <TableRow
                    key={lead.id}
                    className="border-b border-gray-50 hover:bg-gray-50/50"
                  >
                    <TableCell>
                      <Link
                        href={`/leads/${lead.id}`}
                        className="text-sm font-medium text-gray-900 hover:text-[#dc2626]"
                      >
                        {lead.title}
                      </Link>
                      <p className="text-xs text-gray-400">{lead.leadNumber}</p>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {lead.client.firstName} {lead.client.lastName}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`${stageColors[lead.stage] || "bg-gray-100 text-gray-700"} hover:bg-opacity-80`}
                      >
                        {lead.stage.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-medium text-gray-900">
                      {lead.estimatedValue
                        ? `$${Number(lead.estimatedValue).toLocaleString()}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {lead.source.replace(/_/g, " ")}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {new Date(lead.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {pages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3">
                <p className="text-sm text-gray-500">
                  Page {currentPage} of {pages} ({total} results)
                </p>
                <div className="flex gap-2">
                  {currentPage > 1 && (
                    <Link
                      href={`/users/${slug}?tab=leads&page=${currentPage - 1}`}
                      className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
                    >
                      <ChevronLeft className="h-4 w-4" /> Previous
                    </Link>
                  )}
                  {currentPage < pages && (
                    <Link
                      href={`/users/${slug}?tab=leads&page=${currentPage + 1}`}
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
