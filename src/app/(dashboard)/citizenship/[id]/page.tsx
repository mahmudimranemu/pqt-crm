import Link from "next/link";
import { notFound } from "next/navigation";
import { auth, type ExtendedSession } from "@/lib/auth";
import { getCitizenshipById } from "@/lib/actions/citizenship";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  User,
  Building,
  Calendar,
  Users,
} from "lucide-react";
import type { CitizenshipStage } from "@prisma/client";
import { StageActions } from "./stage-actions";
import { CitizenshipProgressTracker } from "./citizenship-progress-tracker";
import { FamilyMembersList } from "./family-members-list";

const stageColors: Record<CitizenshipStage, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  DOCUMENT_COLLECTION: "secondary",
  PROPERTY_VALUATION: "secondary",
  APPLICATION_FILED: "default",
  BIOMETRICS_SCHEDULED: "default",
  BIOMETRICS_COMPLETED: "default",
  UNDER_REVIEW: "warning",
  INTERVIEW_SCHEDULED: "warning",
  INTERVIEW_COMPLETED: "warning",
  APPROVED: "success",
  PASSPORT_ISSUED: "success",
  REJECTED: "destructive",
};

const stageLabels: Record<CitizenshipStage, string> = {
  DOCUMENT_COLLECTION: "Document Collection",
  PROPERTY_VALUATION: "Property Valuation",
  APPLICATION_FILED: "Application Filed",
  BIOMETRICS_SCHEDULED: "Biometrics Scheduled",
  BIOMETRICS_COMPLETED: "Biometrics Completed",
  UNDER_REVIEW: "Under Review",
  INTERVIEW_SCHEDULED: "Interview Scheduled",
  INTERVIEW_COMPLETED: "Interview Completed",
  APPROVED: "Approved",
  PASSPORT_ISSUED: "Passport Issued",
  REJECTED: "Rejected",
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(amount);
}

interface CitizenshipDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CitizenshipDetailPage({ params }: CitizenshipDetailPageProps) {
  const { id } = await params;
  const session = (await auth()) as ExtendedSession | null;
  const isViewer = session?.user?.role === "VIEWER";

  let application;
  try {
    application = await getCitizenshipById(id);
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/citizenship">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            Application: {application.applicationNumber || application.id.slice(0, 8).toUpperCase()}
          </h1>
          <p className="text-muted-foreground">
            {application.client.firstName} {application.client.lastName}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={stageColors[application.stage]} className="text-sm px-3 py-1">
            {stageLabels[application.stage]}
          </Badge>
          {!isViewer && (
            <StageActions applicationId={application.id} currentStage={application.stage} />
          )}
        </div>
      </div>

      {/* Info Cards Row */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Client Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4 text-[#dc2626]" />
              Main Applicant
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Name</p>
              <Link
                href={`/clients/${application.client.id}`}
                className="font-medium text-gray-900 hover:underline text-sm"
              >
                {application.client.firstName} {application.client.lastName}
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Nationality</p>
                <p className="font-medium text-sm">{application.client.nationality || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Passport</p>
                <p className="font-medium text-sm">{application.client.passportNumber || "-"}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="font-medium text-sm">{application.client.email || "-"}</p>
            </div>
          </CardContent>
        </Card>

        {/* Property & Sale Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building className="h-4 w-4 text-[#dc2626]" />
              Property & Investment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Property</p>
              <Link
                href={`/properties/${application.sale.property.id}`}
                className="font-medium text-gray-900 hover:underline text-sm"
              >
                {application.sale.property.name}
              </Link>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Investment Amount</p>
              <p className="font-semibold text-lg text-[#dc2626]">
                {formatCurrency(Number(application.sale.salePrice))}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Sales Agent</p>
              <p className="font-medium text-sm">
                {application.sale.agent.firstName} {application.sale.agent.lastName}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Timeline & Family */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4 text-[#dc2626]" />
              Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Start Date</p>
                <p className="font-medium text-sm">
                  {new Date(application.startDate).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Est. Completion</p>
                <p className="font-medium text-sm">
                  {application.estimatedCompletionDate
                    ? new Date(application.estimatedCompletionDate).toLocaleDateString()
                    : "-"}
                </p>
              </div>
            </div>
            {application.actualCompletionDate && (
              <div>
                <p className="text-xs text-muted-foreground">Actual Completion</p>
                <p className="font-medium text-sm text-green-600">
                  {new Date(application.actualCompletionDate).toLocaleDateString()}
                </p>
              </div>
            )}
            <div className="pt-2 border-t">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {application.familyMembers.length} family member{application.familyMembers.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
            {application.notes && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">Notes</p>
                <p className="text-sm whitespace-pre-wrap">{application.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Progress Tracker - The main feature */}
      <CitizenshipProgressTracker
        applicationId={application.id}
        milestones={application.milestones}
        isViewer={isViewer}
      />

      {/* Family Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-[#dc2626]" />
            Family Members ({application.familyMembers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FamilyMembersList
            applicationId={application.id}
            members={application.familyMembers}
          />
        </CardContent>
      </Card>
    </div>
  );
}
