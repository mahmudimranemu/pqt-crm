import { auth, type ExtendedSession } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Download,
  Upload,
  FileSpreadsheet,
  Users,
  Target,
  MessageSquare,
  Handshake,
  DollarSign,
  Building,
} from "lucide-react";
import Link from "next/link";

const exportCards = [
  {
    title: "Clients",
    description: "Export all client records",
    icon: Users,
  },
  {
    title: "Leads",
    description: "Export lead pipeline data",
    icon: Target,
  },
  {
    title: "Enquiries",
    description: "Export enquiry records",
    icon: MessageSquare,
  },
  {
    title: "Deals",
    description: "Export deal pipeline data",
    icon: Handshake,
  },
  {
    title: "Payments",
    description: "Export payment records",
    icon: DollarSign,
  },
  {
    title: "Properties",
    description: "Export property listings",
    icon: Building,
  },
];

export default async function ImportExportPage() {
  const session = (await auth()) as ExtendedSession | null;

  if (
    !session?.user?.role ||
    !["SUPER_ADMIN", "ADMIN"].includes(session.user.role)
  ) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="border border-gray-200 max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mx-auto mb-4">
              <FileSpreadsheet className="h-6 w-6 text-red-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Access Denied
            </h2>
            <p className="text-sm text-gray-500">
              You don&apos;t have permission to access this page. Only
              administrators can manage data import and export.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
          <FileSpreadsheet className="h-5 w-5 text-[#dc2626]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Import &amp; Export
          </h1>
          <p className="text-gray-500">
            Manage your CRM data imports and exports
          </p>
        </div>
      </div>

      {/* Export Section */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Download className="h-5 w-5 text-[#dc2626]" />
            Export Data
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Download your CRM data as CSV files
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {exportCards.map((card) => (
            <Card key={card.title} className="border border-gray-200">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                    <card.icon className="h-4 w-4 text-[#dc2626]" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold text-gray-900">
                      {card.title}
                    </CardTitle>
                    <CardDescription className="text-xs text-gray-500">
                      {card.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 text-[#dc2626] border-[#dc2626] hover:bg-[#dc2626] hover:text-white"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export CSV
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="text-xs text-gray-400">
          Export buttons trigger client-side CSV generation from the respective
          list pages
        </p>
      </div>

      {/* Import Section */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Upload className="h-5 w-5 text-[#dc2626]" />
            Import Data
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Import data from CSV files into the CRM
          </p>
        </div>

        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 shrink-0">
                <FileSpreadsheet className="h-5 w-5 text-[#dc2626]" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900 mb-1">
                  CSV Import Tool
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Currently, CSV import is available for enquiries. Navigate to
                  the Enquiries page and use the Import button.
                </p>
                <Link href="/clients/enquiries">
                  <Button
                    size="sm"
                    className="gap-2 bg-[#dc2626] hover:bg-[#b91c1c] text-white"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Go to Enquiries Import
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
