import { auth, type ExtendedSession } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Plus, Clock } from "lucide-react";

const templates = [
  {
    id: "welcome",
    name: "Welcome Email",
    subject: "Welcome to Property Quest Turkey",
    description:
      "Sent automatically to new clients after their enquiry is received.",
    status: "active" as const,
    lastEdited: "2025-12-15",
  },
  {
    id: "viewing-confirmation",
    name: "Viewing Confirmation",
    subject: "Your Property Viewing is Confirmed",
    description:
      "Sent when a property viewing is scheduled and confirmed by an agent.",
    status: "active" as const,
    lastEdited: "2025-11-20",
  },
  {
    id: "offer-received",
    name: "Offer Received",
    subject: "We've Received Your Offer",
    description:
      "Acknowledgement email sent when a client submits a property offer.",
    status: "active" as const,
    lastEdited: "2025-11-10",
  },
  {
    id: "deal-closed",
    name: "Deal Closed",
    subject: "Congratulations on Your New Property!",
    description:
      "Congratulatory email sent to clients when their deal is completed.",
    status: "draft" as const,
    lastEdited: "2025-10-28",
  },
  {
    id: "follow-up",
    name: "Follow-Up Reminder",
    subject: "Just Checking In",
    description:
      "Periodic follow-up email for leads that have gone inactive after initial contact.",
    status: "draft" as const,
    lastEdited: "2025-10-15",
  },
];

export default async function EmailTemplatesPage() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) return null;

  if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">
          You don&apos;t have permission to view this page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
            <Mail className="h-5 w-5 text-[#dc2626]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Email Templates
            </h1>
            <p className="text-gray-500">
              Manage email templates for automated client communications
            </p>
          </div>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-[#dc2626] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#b91c1c]">
          <Plus className="h-4 w-4" />
          Create Template
        </button>
      </div>

      <div className="grid gap-4">
        {templates.map((template) => (
          <Card
            key={template.id}
            className="border border-gray-200 transition-colors hover:border-gray-300"
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900">
                      {template.name}
                    </h3>
                    <Badge
                      className={
                        template.status === "active"
                          ? "bg-green-100 text-green-700 hover:bg-green-100"
                          : "bg-yellow-100 text-yellow-700 hover:bg-yellow-100"
                      }
                    >
                      {template.status === "active" ? "Active" : "Draft"}
                    </Badge>
                  </div>
                  <p className="mb-1 text-sm font-medium text-gray-600">
                    Subject: {template.subject}
                  </p>
                  <p className="text-sm text-gray-500">
                    {template.description}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Clock className="h-3 w-3" />
                  <span>
                    Edited{" "}
                    {new Date(template.lastEdited).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="rounded-lg border border-amber-100 bg-amber-50/50 p-4">
        <p className="text-sm text-gray-600">
          <strong>Coming Soon:</strong> Full template editor with variable
          placeholders, HTML preview, and scheduling. Templates will integrate
          with the automation engine for trigger-based sending.
        </p>
      </div>
    </div>
  );
}
