import { auth, type ExtendedSession } from "@/lib/auth";
import { getLeadById, getAgentsForLeads } from "@/lib/actions/leads";
import { getActiveProperties } from "@/lib/actions/enquiries";
import { updateLeadTags } from "@/lib/actions/leads";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Phone,
  Mail,
  Globe,
  Calendar,
  User,
  MessageSquare,
  CheckSquare,
  DollarSign,
  Target,
  Tag,
} from "lucide-react";
import Link from "next/link";
import { LeadDetailFields } from "./lead-detail-fields";
import { LeadNotes } from "./lead-notes";
import { LeadPropertySelector } from "./lead-property-selector";
import { TagManager } from "@/components/tag-manager";

const stageColors: Record<string, string> = {
  NEW_ENQUIRY: "bg-gray-100 text-gray-700",
  CONTACTED: "bg-blue-100 text-blue-700",
  QUALIFIED: "bg-indigo-100 text-indigo-700",
  VIEWING_ARRANGED: "bg-purple-100 text-purple-700",
  VIEWED: "bg-pink-100 text-pink-700",
  OFFER_MADE: "bg-orange-100 text-orange-700",
  NEGOTIATING: "bg-yellow-100 text-yellow-700",
  WON: "bg-emerald-100 text-emerald-700",
  LOST: "bg-red-100 text-red-700",
};

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) return null;

  const { id } = await params;

  let lead: Awaited<ReturnType<typeof getLeadById>>;
  let agents: Awaited<ReturnType<typeof getAgentsForLeads>>;
  let properties: Awaited<ReturnType<typeof getActiveProperties>>;

  try {
    [lead, agents, properties] = await Promise.all([
      getLeadById(id),
      getAgentsForLeads(),
      getActiveProperties(),
    ]);
  } catch (error) {
    console.error("Lead detail page error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return (
      <div className="py-12 text-center space-y-2">
        <p className="text-gray-500">Could not load lead.</p>
        <p className="text-xs text-red-500">{message}</p>
        <Link
          href="/leads"
          className="mt-4 text-[#dc2626] hover:underline text-sm inline-block"
        >
          Back to leads
        </Link>
      </div>
    );
  }

  const serializedNotes = lead.notes.map((note) => ({
    ...note,
    createdAt: note.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/leads">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{lead.title}</h1>
              <Badge className={stageColors[lead.stage]}>
                {lead.stage.replace(/_/g, " ")}
              </Badge>
            </div>
            <p className="text-sm text-gray-500">
              {lead.leadNumber}
              {lead.owner && (
                <>
                  {" "}
                  &middot; Owner: {lead.owner.firstName} {lead.owner.lastName}
                </>
              )}
            </p>
          </div>
        </div>
        {lead.convertedDeal && (
          <Link href={`/deals/${lead.convertedDeal.id}`}>
            <Button variant="outline" className="gap-2">
              View Deal {lead.convertedDeal.dealNumber}
            </Button>
          </Link>
        )}
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-sm">Estimated Value</span>
            </div>
            <p className="font-medium text-sm">
              {lead.estimatedValue
                ? `$${Number(lead.estimatedValue).toLocaleString()} ${lead.currency}`
                : "Not set"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <Target className="h-4 w-4" />
              <span className="text-sm">Source</span>
            </div>
            <p className="font-medium text-sm">
              {lead.source?.replace(/_/g, " ") || "Not set"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <User className="h-4 w-4" />
              <span className="text-sm">Score</span>
            </div>
            <p className="font-medium text-sm">
              {lead.score !== null ? `${lead.score}/100` : "Not scored"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <Calendar className="h-4 w-4" />
              <span className="text-sm">Created</span>
            </div>
            <p className="font-medium text-sm">
              {new Date(lead.createdAt).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Editable Fields */}
        <div className="lg:col-span-1 space-y-6">
          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Tags
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TagManager
                entityId={lead.id}
                tags={lead.tags}
                onUpdate={updateLeadTags}
              />
            </CardContent>
          </Card>

          {/* Property Selector */}
          <LeadPropertySelector
            leadId={lead.id}
            currentProperty={lead.interestedProperty}
            properties={properties}
          />

          {/* Editable Fields */}
          <LeadDetailFields
            lead={{
              id: lead.id,
              stage: lead.stage,
              segment: lead.segment,
              priority: lead.priority,
              nextCallDate: lead.nextCallDate?.toISOString() || null,
              snooze: lead.snooze,
              ownerId: lead.ownerId,
              temperature: lead.temperature,
              tags: lead.tags,
            }}
            agents={agents}
          />

          {/* Client Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                Client
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm font-medium text-gray-900">
                {lead.client.firstName} {lead.client.lastName}
              </p>
              {lead.client.email && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="h-4 w-4" />
                  {lead.client.email}
                </div>
              )}
              {lead.client.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="h-4 w-4" />
                  {lead.client.phone}
                </div>
              )}
              {lead.client.whatsapp && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MessageSquare className="h-4 w-4" />
                  {lead.client.whatsapp}
                </div>
              )}
              {lead.client.nationality && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Globe className="h-4 w-4" />
                  {lead.client.nationality}
                </div>
              )}
              <Link href={`/clients/${lead.client.id}`}>
                <Button variant="outline" size="sm" className="w-full mt-2">
                  View Full Profile
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckSquare className="h-4 w-4" />
                Tasks ({lead.tasks.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lead.tasks.length === 0 ? (
                <p className="text-sm text-gray-500">No tasks.</p>
              ) : (
                <div className="space-y-2">
                  {lead.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-2 rounded-lg bg-gray-50 p-2"
                    >
                      <CheckSquare
                        className={`h-4 w-4 ${
                          task.status === "DONE"
                            ? "text-emerald-500"
                            : "text-gray-400"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {task.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {task.assignee.firstName} {task.assignee.lastName}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Notes + Activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Notes */}
          <LeadNotes leadId={lead.id} notes={serializedNotes} />

          {/* Activity Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Activity Log ({lead.activities.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lead.activities.length === 0 ? (
                <p className="text-sm text-gray-500">No activity yet.</p>
              ) : (
                <div className="space-y-3">
                  {lead.activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex gap-3 border-l-2 border-gray-200 pl-4"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {activity.title}
                        </p>
                        {activity.description && (
                          <p className="text-sm text-gray-500">
                            {activity.description}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-gray-400">
                          {activity.user.firstName} {activity.user.lastName}{" "}
                          &middot;{" "}
                          {new Date(activity.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
