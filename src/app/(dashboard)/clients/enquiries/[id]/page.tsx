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
import {
  ArrowLeft,
  Mail,
  Phone,
  Globe,
  DollarSign,
  Calendar,
  Clock,
  User,
  MessageSquare,
  Tag,
} from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/utils";
import { EnquiryDetailFields } from "./enquiry-detail-fields";
import { EnquiryNotes } from "./enquiry-notes";
import { EnquiryPropertySelector } from "./enquiry-property-selector";
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
      </div>

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
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <Globe className="h-4 w-4" />
              <span className="text-sm">Country</span>
            </div>
            <p className="font-medium text-sm">
              {enquiry.country || "Not specified"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-sm">Budget</span>
            </div>
            <p className="font-medium text-sm">
              {enquiry.budget || "Not specified"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Details + Editable Fields */}
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
                  <p className="text-sm mt-1 truncate text-[#dc2626]">
                    {enquiry.sourceUrl}
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
              {enquiry.tags.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                    Tags
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {enquiry.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-600"
                      >
                        <Tag className="h-3 w-3" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
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

          {/* Editable Fields */}
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
            }}
            agents={agents}
          />
        </div>

        {/* Right Column: Notes Timeline */}
        <div className="lg:col-span-2">
          <EnquiryNotes enquiryId={enquiry.id} notes={serializedNotes} />
        </div>
      </div>
    </div>
  );
}
