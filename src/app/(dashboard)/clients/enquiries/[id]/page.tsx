import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getEnquiry,
  getAgents,
  getActiveProperties,
} from "@/lib/actions/enquiries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Mail, Phone, MessageSquare } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { EnquiryDetailFields } from "./enquiry-detail-fields";
import { EnquiryNotes } from "./enquiry-notes";
import { EnquiryPropertySelector } from "./enquiry-property-selector";
import { ConvertEnquiryDialog } from "./convert-enquiry-dialog";
import { EditableInfoCard } from "./editable-info-card";
import { TagManager } from "@/components/tag-manager";
import { updateEnquiryTags } from "@/lib/actions/enquiries";
import type { EnquiryStatus, EnquirySource } from "@prisma/client";

interface PageProps {
  params: Promise<{ id: string }>;
}

const statusColors: Record<
  EnquiryStatus,
  "default" | "secondary" | "success" | "warning" | "destructive"
> = {
  NEW: "secondary",
  ASSIGNED: "default",
  CONTACTED: "warning",
  CONVERTED_TO_CLIENT: "success",
  SPAM: "destructive",
  CLOSED: "default",
};

const statusLabels: Record<EnquiryStatus, string> = {
  NEW: "New",
  ASSIGNED: "Assigned",
  CONTACTED: "Contacted",
  CONVERTED_TO_CLIENT: "Converted",
  SPAM: "Spam",
  CLOSED: "Closed",
};

const sourceLabels: Record<EnquirySource, string> = {
  WEBSITE_FORM: "Website Form",
  PHONE_CALL: "Phone Call",
  EMAIL: "Email",
  WHATSAPP: "WhatsApp",
  LIVE_CHAT: "Live Chat",
  PARTNER_REFERRAL: "Partner Referral",
};

export default async function EnquiryDetailPage({ params }: PageProps) {
  const { id } = await params;
  const [enquiry, agents, properties] = await Promise.all([
    getEnquiry(id),
    getAgents(),
    getActiveProperties(),
  ]);

  if (!enquiry) {
    notFound();
  }

  const serializedNotes = enquiry.notes.map((note) => ({
    ...note,
    createdAt: note.createdAt.toISOString(),
  }));

  const isConverted = enquiry.status === "CONVERTED_TO_CLIENT";
  const isSpamOrClosed =
    enquiry.status === "SPAM" || enquiry.status === "CLOSED";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/clients/enquiries">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {enquiry.firstName} {enquiry.lastName}
              </h1>
              <Badge variant={statusColors[enquiry.status]}>
                {statusLabels[enquiry.status]}
              </Badge>
            </div>
            <p className="text-sm text-gray-500">
              Enquiry received {formatDateTime(enquiry.createdAt)}
              {enquiry.assignedAgent && (
                <>
                  {" "}
                  &middot; Assigned to {enquiry.assignedAgent.firstName}{" "}
                  {enquiry.assignedAgent.lastName}
                </>
              )}
            </p>
          </div>
        </div>

        {/* Convert Button */}
        {!isConverted && !isSpamOrClosed && (
          <ConvertEnquiryDialog
            enquiryId={enquiry.id}
            enquiryName={`${enquiry.firstName} ${enquiry.lastName}`}
            enquiryBudget={enquiry.budget}
            enquiryCountry={enquiry.country}
            enquiryMessage={enquiry.message}
          />
        )}
      </div>

      {/* Converted Banner */}
      {isConverted && enquiry.convertedClient && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-800">
                This enquiry has been converted to a client and lead
              </p>
              <p className="text-sm text-green-600 mt-0.5">
                Client: {enquiry.convertedClient.firstName}{" "}
                {enquiry.convertedClient.lastName}
              </p>
            </div>
            <div className="flex gap-2">
              <Link href={`/clients/${enquiry.convertedClient.id}`}>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-green-300 text-green-700 hover:bg-green-100"
                >
                  View Client
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <Mail className="h-4 w-4" />
              <span className="text-sm">Email</span>
            </div>
            <p className="font-medium text-sm">{enquiry.email}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <Phone className="h-4 w-4" />
              <span className="text-sm">Phone</span>
            </div>
            <p className="font-medium text-sm">{enquiry.phone}</p>
          </CardContent>
        </Card>
        <EditableInfoCard
          enquiryId={enquiry.id}
          field="country"
          label="Country"
          value={enquiry.country}
          icon="globe"
        />
        <EditableInfoCard
          enquiryId={enquiry.id}
          field="budget"
          label="Budget"
          value={enquiry.budget}
          icon="dollar"
        />
      </div>

      {/* Lead Management - Full Width */}
      <EnquiryDetailFields
        enquiry={{
          id: enquiry.id,
          called: enquiry.called,
          spoken: enquiry.spoken,
          segment: enquiry.segment,
          leadStatus: enquiry.leadStatus,
          priority: enquiry.priority,
          nextCallDate: enquiry.nextCallDate?.toISOString() || null,
          snooze: enquiry.snooze,
          assignedAgentId: enquiry.assignedAgentId,
          tags: enquiry.tags,
        }}
        agents={agents}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Details */}
        <div className="lg:col-span-1 space-y-6">
          {/* Enquiry Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Enquiry Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  Source
                </p>
                <p className="text-sm font-medium mt-1">
                  {sourceLabels[enquiry.source]}
                </p>
              </div>
              {enquiry.sourceUrl && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">
                    Source URL
                  </p>
                  <p className="text-sm mt-1 break-all">
                    {(() => {
                      const url = enquiry.sourceUrl.split(" | ")[0].trim();
                      if (url.startsWith("http")) {
                        return (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#dc2626] hover:underline"
                          >
                            {url}
                          </a>
                        );
                      }
                      return (
                        <span className="text-gray-700">
                          {enquiry.sourceUrl}
                        </span>
                      );
                    })()}
                  </p>
                </div>
              )}
              {enquiry.message && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">
                    Message
                  </p>
                  <p className="text-sm mt-1 whitespace-pre-wrap text-gray-700">
                    {enquiry.message}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                  Tags
                </p>
                <TagManager
                  entityId={enquiry.id}
                  tags={enquiry.tags}
                  onUpdate={updateEnquiryTags}
                  compact
                />
              </div>
              {enquiry.convertedClient && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">
                    Converted Client
                  </p>
                  <Link
                    href={`/clients/${enquiry.convertedClient.id}`}
                    className="text-sm font-medium text-[#dc2626] hover:underline mt-1 inline-block"
                  >
                    {enquiry.convertedClient.firstName}{" "}
                    {enquiry.convertedClient.lastName}
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Property Assignment */}
          <EnquiryPropertySelector
            enquiryId={enquiry.id}
            currentProperty={enquiry.interestedProperty}
            properties={properties}
          />
        </div>

        {/* Right Column: Notes + Activity Log */}
        <div className="lg:col-span-2 space-y-6">
          <EnquiryNotes enquiryId={enquiry.id} notes={serializedNotes} />

          {/* Activity Log */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Activity Log ({enquiry.activities.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {enquiry.activities.length === 0 ? (
                <p className="text-sm text-gray-500">No activity yet.</p>
              ) : (
                <div className="space-y-3">
                  {enquiry.activities.map((activity) => (
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
