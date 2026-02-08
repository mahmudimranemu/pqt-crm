import Link from "next/link";
import { notFound } from "next/navigation";
import { getCitizenshipById } from "@/lib/actions/citizenship";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  User,
  Building,
  Calendar,
  CheckCircle,
  Clock,
  Users,
  FileText,
  Flag,
} from "lucide-react";
import type { CitizenshipStage, MilestoneStatus } from "@prisma/client";
import { StageActions } from "./stage-actions";
import { MilestoneList } from "./milestone-list";
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

const allStages: CitizenshipStage[] = [
  "DOCUMENT_COLLECTION",
  "PROPERTY_VALUATION",
  "APPLICATION_FILED",
  "BIOMETRICS_SCHEDULED",
  "BIOMETRICS_COMPLETED",
  "UNDER_REVIEW",
  "INTERVIEW_SCHEDULED",
  "INTERVIEW_COMPLETED",
  "APPROVED",
  "PASSPORT_ISSUED",
];

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

  let application;
  try {
    application = await getCitizenshipById(id);
  } catch {
    notFound();
  }

  const currentStageIndex = allStages.indexOf(application.stage);

  return (
    <div className="space-y-6">
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
        <Badge variant={stageColors[application.stage]} className="text-sm px-3 py-1">
          {stageLabels[application.stage]}
        </Badge>
      </div>

      {/* Progress Tracker */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Application Progress</span>
            <StageActions applicationId={application.id} currentStage={application.stage} />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <div className="flex items-center justify-between">
              {allStages.slice(0, 5).map((stage, index) => (
                <div key={stage} className="flex flex-col items-center flex-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${
                      index <= currentStageIndex
                        ? "bg-[#dc2626] text-white"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {index < currentStageIndex ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span className="text-xs mt-1 text-center max-w-[60px]">
                    {stageLabels[stage].split(" ")[0]}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-4">
              {allStages.slice(5).map((stage, index) => (
                <div key={stage} className="flex flex-col items-center flex-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${
                      index + 5 <= currentStageIndex
                        ? "bg-[#dc2626] text-white"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {index + 5 < currentStageIndex ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      index + 6
                    )}
                  </div>
                  <span className="text-xs mt-1 text-center max-w-[60px]">
                    {stageLabels[stage].split(" ")[0]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Client Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Main Applicant
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <Link
                  href={`/clients/${application.client.id}`}
                  className="font-medium text-gray-900 hover:underline"
                >
                  {application.client.firstName} {application.client.lastName}
                </Link>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Nationality</p>
                <p className="font-medium">{application.client.nationality || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Passport</p>
                <p className="font-medium">{application.client.passportNumber || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{application.client.email || "-"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Property & Sale Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Property & Investment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Property</p>
              <Link
                href={`/properties/${application.sale.property.id}`}
                className="font-medium text-gray-900 hover:underline"
              >
                {application.sale.property.name}
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Investment Amount</p>
                <p className="font-semibold text-lg text-[#dc2626]">
                  {formatCurrency(Number(application.sale.salePrice))}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sales Agent</p>
                <p className="font-medium">
                  {application.sale.agent.firstName} {application.sale.agent.lastName}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timeline Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Start Date</p>
                <p className="font-medium">
                  {new Date(application.startDate).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Est. Completion</p>
                <p className="font-medium">
                  {application.estimatedCompletionDate
                    ? new Date(application.estimatedCompletionDate).toLocaleDateString()
                    : "-"}
                </p>
              </div>
              {application.actualCompletionDate && (
                <div>
                  <p className="text-sm text-muted-foreground">Actual Completion</p>
                  <p className="font-medium text-green-600">
                    {new Date(application.actualCompletionDate).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
            {application.notes && (
              <div>
                <p className="text-sm text-muted-foreground">Notes</p>
                <p className="font-medium whitespace-pre-wrap">{application.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Family Members */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
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

      {/* Milestones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5" />
            Milestones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MilestoneList milestones={application.milestones} />
        </CardContent>
      </Card>
    </div>
  );
}
