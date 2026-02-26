import Link from "next/link";
import { getUserEnquiries } from "@/lib/actions/user-profile";
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
import { Mail, ChevronLeft, ChevronRight } from "lucide-react";

const statusColors: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-700 border-blue-200",
  ASSIGNED: "bg-purple-100 text-purple-700 border-purple-200",
  CONTACTED: "bg-yellow-100 text-yellow-700 border-yellow-200",
  CONVERTED_TO_CLIENT: "bg-green-100 text-green-700 border-green-200",
  SPAM: "bg-red-100 text-red-700 border-red-200",
  CLOSED: "bg-gray-100 text-gray-700 border-gray-200",
};

interface EnquiriesTabProps {
  userId: string;
  page: number;
  slug: string;
}

export async function EnquiriesTab({ userId, page, slug }: EnquiriesTabProps) {
  const { enquiries, total, pages, currentPage } = await getUserEnquiries(
    userId,
    page,
  );

  return (
    <Card className="border border-gray-200">
      <div className="flex items-center justify-between border-b border-gray-100 p-5">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Enquiries</h2>
          <p className="text-sm text-gray-500">{total} total enquiries assigned</p>
        </div>
      </div>
      <CardContent className="p-0">
        {enquiries.length === 0 ? (
          <div className="py-12 text-center">
            <Mail className="mx-auto mb-4 h-12 w-12 text-gray-300" />
            <p className="text-gray-500">No enquiries assigned to this user.</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="border-b border-gray-100 bg-gray-50/50">
                  <TableHead className="text-xs font-medium text-gray-500">
                    Contact
                  </TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">
                    Email / Phone
                  </TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">
                    Status
                  </TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">
                    Source
                  </TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">
                    Property
                  </TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">
                    Date
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enquiries.map((enquiry) => (
                  <TableRow
                    key={enquiry.id}
                    className="border-b border-gray-50 hover:bg-gray-50/50"
                  >
                    <TableCell>
                      <Link
                        href={`/clients/enquiries`}
                        className="text-sm font-medium text-gray-900 hover:text-[#dc2626]"
                      >
                        {enquiry.firstName} {enquiry.lastName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5 text-sm text-gray-600">
                        <div>{enquiry.email}</div>
                        <div className="text-gray-400">{enquiry.phone}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`${statusColors[enquiry.status] || "bg-gray-100 text-gray-700"} hover:bg-opacity-80`}
                      >
                        {enquiry.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {enquiry.source.replace(/_/g, " ")}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {enquiry.interestedProperty?.name || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {new Date(enquiry.createdAt).toLocaleDateString("en-GB", {
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
                      href={`/users/${slug}?tab=enquiries&page=${currentPage - 1}`}
                      className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
                    >
                      <ChevronLeft className="h-4 w-4" /> Previous
                    </Link>
                  )}
                  {currentPage < pages && (
                    <Link
                      href={`/users/${slug}?tab=enquiries&page=${currentPage + 1}`}
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
