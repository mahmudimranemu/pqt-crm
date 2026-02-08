import Link from "next/link";
import { getDocuments, getDocumentStats } from "@/lib/actions/documents";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  FileText,
  Download,
  User,
  Flag,
  Folder,
} from "lucide-react";
import type { DocumentCategory } from "@prisma/client";
import { UploadDocumentDialog } from "./upload-document-dialog";

const categoryColors: Record<DocumentCategory, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  PASSPORT: "default",
  TITLE_DEED: "success",
  POWER_OF_ATTORNEY: "warning",
  CITIZENSHIP_APPLICATION: "secondary",
  CONTRACT: "default",
  BANK_STATEMENT: "secondary",
  PHOTO: "default",
  BIRTH_CERTIFICATE: "default",
  MARRIAGE_CERTIFICATE: "default",
  OTHER: "secondary",
};

const categoryLabels: Record<DocumentCategory, string> = {
  PASSPORT: "Passport",
  TITLE_DEED: "Title Deed",
  POWER_OF_ATTORNEY: "Power of Attorney",
  CITIZENSHIP_APPLICATION: "Citizenship App",
  CONTRACT: "Contract",
  BANK_STATEMENT: "Bank Statement",
  PHOTO: "Photo",
  BIRTH_CERTIFICATE: "Birth Certificate",
  MARRIAGE_CERTIFICATE: "Marriage Certificate",
  OTHER: "Other",
};

const fileTypeIcons: Record<string, string> = {
  pdf: "PDF",
  jpg: "JPG",
  jpeg: "JPG",
  png: "PNG",
  doc: "DOC",
  docx: "DOCX",
};

export default async function DocumentsPage() {
  const [{ documents, total }, stats] = await Promise.all([
    getDocuments(),
    getDocumentStats(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-muted-foreground">
            Manage client and application documents
          </p>
        </div>
        <UploadDocumentDialog />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          </CardContent>
        </Card>
        {stats.byCategory.slice(0, 3).map((cat) => (
          <Card key={cat.category}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {categoryLabels[cat.category]}
              </CardTitle>
              <Folder className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{cat._count.id}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Documents ({total})</CardTitle>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No documents uploaded yet.</p>
              <UploadDocumentDialog />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Application</TableHead>
                  <TableHead>Uploaded By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => {
                  const fileExt = doc.fileType.toLowerCase();
                  return (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          {doc.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={categoryColors[doc.category]}>
                          {categoryLabels[doc.category]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {fileTypeIcons[fileExt] || fileExt.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {doc.client ? (
                          <Link
                            href={`/clients/${doc.client.id}`}
                            className="flex items-center gap-1 text-gray-900 hover:underline"
                          >
                            <User className="h-3 w-3" />
                            {doc.client.firstName} {doc.client.lastName}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {doc.application ? (
                          <Link
                            href={`/citizenship/${doc.application.id}`}
                            className="flex items-center gap-1 text-gray-900 hover:underline"
                          >
                            <Flag className="h-3 w-3" />
                            {doc.application.applicationNumber || "View"}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {doc.uploadedBy.firstName} {doc.uploadedBy.lastName}
                      </TableCell>
                      <TableCell>
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex"
                        >
                          <Button size="sm" variant="ghost">
                            <Download className="h-4 w-4" />
                          </Button>
                        </a>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
