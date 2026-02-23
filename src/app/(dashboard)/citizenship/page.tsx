import Link from "next/link";
import { auth, type ExtendedSession } from "@/lib/auth";
import {
  getCitizenshipApplications,
  getCitizenshipStats,
} from "@/lib/actions/citizenship";
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
import { Plus, Flag, Clock, CheckCircle, Award, Users } from "lucide-react";
import type { CitizenshipStage, MilestoneStatus } from "@prisma/client";

const stageColors: Record<
  CitizenshipStage,
  "default" | "secondary" | "success" | "warning" | "destructive"
> = {
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

function MiniProgressBar({
  milestones,
}: {
  milestones: { id: string; status: MilestoneStatus }[];
}) {
  const total = milestones.length;
  const completed = milestones.filter((m) => m.status === "COMPLETED").length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 bg-gray-200 rounded-full h-2">
        <div
          className="bg-[#dc2626] h-2 rounded-full transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
        {completed}/{total}
      </span>
    </div>
  );
}

export default async function CitizenshipPage() {
  const session = (await auth()) as ExtendedSession | null;
  const [{ applications, total }, stats] = await Promise.all([
    getCitizenshipApplications(),
    getCitizenshipStats(),
  ]);

  const statCards = [
    { title: "Total Applications", value: stats.total, icon: Flag },
    { title: "In Progress", value: stats.inProgress, icon: Clock },
    { title: "Approved", value: stats.approved, icon: CheckCircle },
    { title: "Passports Issued", value: stats.passportIssued, icon: Award },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Citizenship Applications
          </h1>
          <p className="text-muted-foreground">
            Track Turkish citizenship by investment applications
          </p>
        </div>
        {session?.user?.role !== "VIEWER" && (
          <Link href="/citizenship/create">
            <Button className="bg-[#dc2626] hover:bg-[#dc2626]/90">
              <Plus className="h-4 w-4 mr-2" />
              New Application
            </Button>
          </Link>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Applications ({total})</CardTitle>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No citizenship applications yet.
              </p>
              <Link href="/citizenship/create">
                <Button variant="outline" className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Start First Application
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Application #</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Family</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Started</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((app) => (
                  <TableRow
                    key={app.id}
                    className="cursor-pointer hover:bg-red-50/50 transition-colors"
                  >
                    <TableCell>
                      <Link
                        href={`/citizenship/${app.id}`}
                        className="font-medium text-[#dc2626] hover:underline"
                      >
                        {app.applicationNumber ||
                          app.id.slice(0, 8).toUpperCase()}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/clients/${app.client.id}`}
                        className="hover:underline"
                      >
                        {app.client.firstName} {app.client.lastName}
                      </Link>
                      <br />
                      <span className="text-xs text-muted-foreground">
                        {app.client.nationality}
                      </span>
                    </TableCell>
                    <TableCell>{app.sale.property.name}</TableCell>
                    <TableCell>
                      {app.sale.agent.firstName} {app.sale.agent.lastName}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{app.familyMembers.length + 1}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={stageColors[app.stage]}>
                        {stageLabels[app.stage]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <MiniProgressBar milestones={app.milestones} />
                    </TableCell>
                    <TableCell>
                      {new Date(app.startDate).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
