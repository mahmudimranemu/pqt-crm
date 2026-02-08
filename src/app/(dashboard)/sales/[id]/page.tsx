import Link from "next/link";
import { notFound } from "next/navigation";
import { getSaleById } from "@/lib/actions/sales";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  User,
  Building,
  Calendar,
  DollarSign,
  FileText,
  CheckCircle,
} from "lucide-react";
import type { SaleStatus } from "@prisma/client";
import { SaleStatusActions } from "./sale-status-actions";

const statusColors: Record<SaleStatus, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  PENDING_DEPOSIT: "warning",
  DEPOSIT_RECEIVED: "default",
  CONTRACT_SIGNED: "secondary",
  TITLE_DEED_TRANSFER: "default",
  COMPLETED: "success",
  CANCELLED: "destructive",
};

const statusLabels: Record<SaleStatus, string> = {
  PENDING_DEPOSIT: "Pending Deposit",
  DEPOSIT_RECEIVED: "Deposit Received",
  CONTRACT_SIGNED: "Contract Signed",
  TITLE_DEED_TRANSFER: "Title Deed Transfer",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: Date | string | null) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

interface SaleDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function SaleDetailPage({ params }: SaleDetailPageProps) {
  const { id } = await params;

  let sale;
  try {
    sale = await getSaleById(id);
  } catch {
    notFound();
  }

  const statusSteps: SaleStatus[] = [
    "PENDING_DEPOSIT",
    "DEPOSIT_RECEIVED",
    "CONTRACT_SIGNED",
    "TITLE_DEED_TRANSFER",
    "COMPLETED",
  ];

  const currentStepIndex = statusSteps.indexOf(sale.status);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/sales">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            Sale: {sale.property.name}
            {sale.unitNumber && ` - Unit ${sale.unitNumber}`}
          </h1>
          <p className="text-muted-foreground">
            {sale.client.firstName} {sale.client.lastName}
          </p>
        </div>
        <Badge variant={statusColors[sale.status]} className="text-sm px-3 py-1">
          {statusLabels[sale.status]}
        </Badge>
      </div>

      {/* Progress Tracker */}
      {sale.status !== "CANCELLED" && (
        <Card>
          <CardHeader>
            <CardTitle>Sale Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              {statusSteps.map((step, index) => (
                <div key={step} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        index <= currentStepIndex
                          ? "bg-[#dc2626] text-white"
                          : "bg-gray-200 text-gray-500"
                      }`}
                    >
                      {index < currentStepIndex ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <span className="text-xs mt-2 text-center max-w-[80px]">
                      {statusLabels[step]}
                    </span>
                  </div>
                  {index < statusSteps.length - 1 && (
                    <div
                      className={`flex-1 h-1 mx-2 ${
                        index < currentStepIndex ? "bg-[#dc2626]" : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="mt-6">
              <SaleStatusActions saleId={sale.id} currentStatus={sale.status} />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Sale Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Sale Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Sale Price</p>
                <p className="font-semibold text-lg text-gray-900">
                  {formatCurrency(Number(sale.salePrice), sale.currency)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Commission</p>
                <p className="font-semibold text-lg text-[#dc2626]">
                  {sale.commissionAmount
                    ? formatCurrency(Number(sale.commissionAmount), sale.currency)
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Deposit Amount</p>
                <p className="font-medium">
                  {sale.depositAmount
                    ? formatCurrency(Number(sale.depositAmount), sale.currency)
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Deposit Date</p>
                <p className="font-medium">{formatDate(sale.depositDate)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completion Date</p>
                <p className="font-medium">{formatDate(sale.completionDate)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Citizenship Eligible</p>
                <Badge variant={sale.citizenshipEligible ? "success" : "secondary"}>
                  {sale.citizenshipEligible ? "Yes" : "No"}
                </Badge>
              </div>
            </div>
            {sale.paymentPlan && (
              <div>
                <p className="text-sm text-muted-foreground">Payment Plan</p>
                <p className="font-medium whitespace-pre-wrap">{sale.paymentPlan}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Client Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Client Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <Link
                href={`/clients/${sale.client.id}`}
                className="font-medium text-gray-900 hover:underline"
              >
                {sale.client.firstName} {sale.client.lastName}
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{sale.client.email || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{sale.client.phone || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Nationality</p>
                <p className="font-medium">{sale.client.nationality || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Passport</p>
                <p className="font-medium">{sale.client.passportNumber || "-"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Property Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Property Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Property</p>
              <Link
                href={`/properties/${sale.property.id}`}
                className="font-medium text-gray-900 hover:underline"
              >
                {sale.property.name}
              </Link>
              <p className="text-sm text-muted-foreground">{sale.property.pqtNumber}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Unit Number</p>
                <p className="font-medium">{sale.unitNumber || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">District</p>
                <p className="font-medium">{sale.property.district}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <p className="font-medium">{sale.property.propertyType.replace("_", " ")}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Developer</p>
                <p className="font-medium">{sale.property.developer || "-"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Agent & Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Additional Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Sales Agent</p>
              <p className="font-medium">
                {sale.agent.firstName} {sale.agent.lastName}
              </p>
              <p className="text-sm text-muted-foreground">{sale.agent.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sale Date</p>
              <p className="font-medium">{formatDate(sale.createdAt)}</p>
            </div>
            {sale.notes && (
              <div>
                <p className="text-sm text-muted-foreground">Notes</p>
                <p className="font-medium whitespace-pre-wrap">{sale.notes}</p>
              </div>
            )}
            {sale.citizenshipApplication && (
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">Citizenship Application</p>
                <Badge variant="default" className="mt-1">
                  {sale.citizenshipApplication.stage.replace("_", " ")}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
