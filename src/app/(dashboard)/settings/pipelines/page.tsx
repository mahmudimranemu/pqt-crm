import { auth, type ExtendedSession } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GitBranch, ArrowRight } from "lucide-react";

const leadStages = [
  {
    value: "NEW_ENQUIRY",
    label: "New Enquiry",
    color: "bg-blue-500",
    description: "Initial enquiry received from a potential client",
  },
  {
    value: "CONTACTED",
    label: "Contacted",
    color: "bg-cyan-500",
    description: "Agent has made first contact with the lead",
  },
  {
    value: "QUALIFIED",
    label: "Qualified",
    color: "bg-indigo-500",
    description: "Lead has been qualified based on budget and requirements",
  },
  {
    value: "VIEWING_ARRANGED",
    label: "Viewing Arranged",
    color: "bg-purple-500",
    description: "Property viewings have been scheduled",
  },
  {
    value: "VIEWED",
    label: "Viewed",
    color: "bg-violet-500",
    description: "Client has completed property viewings",
  },
  {
    value: "OFFER_MADE",
    label: "Offer Made",
    color: "bg-amber-500",
    description: "Client has submitted an offer on a property",
  },
  {
    value: "NEGOTIATING",
    label: "Negotiating",
    color: "bg-orange-500",
    description: "Price negotiation is in progress",
  },
  {
    value: "WON",
    label: "Won",
    color: "bg-green-500",
    description: "Lead converted successfully into a deal",
  },
  {
    value: "LOST",
    label: "Lost",
    color: "bg-red-500",
    description: "Lead did not convert",
  },
];

const dealStages = [
  {
    value: "RESERVATION",
    label: "Reservation",
    color: "bg-blue-500",
    description: "Initial reservation fee paid to hold the property",
  },
  {
    value: "DEPOSIT",
    label: "Deposit",
    color: "bg-cyan-500",
    description: "Deposit payment received from the buyer",
  },
  {
    value: "CONTRACT",
    label: "Contract",
    color: "bg-indigo-500",
    description: "Sales contract signed by both parties",
  },
  {
    value: "PAYMENT_PLAN",
    label: "Payment Plan",
    color: "bg-purple-500",
    description: "Instalment payment plan set up and in progress",
  },
  {
    value: "TITLE_DEED",
    label: "Title Deed",
    color: "bg-amber-500",
    description: "Title deed transfer is being processed",
  },
  {
    value: "COMPLETED",
    label: "Completed",
    color: "bg-green-500",
    description: "Deal fully completed with title deed transferred",
  },
  {
    value: "CANCELLED",
    label: "Cancelled",
    color: "bg-red-500",
    description: "Deal was cancelled by either party",
  },
];

export default async function PipelinesPage() {
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
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
          <GitBranch className="h-5 w-5 text-[#dc2626]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Pipeline Configuration
          </h1>
          <p className="text-gray-500">
            View and manage the stages for leads and deals
          </p>
        </div>
      </div>

      {/* Lead Pipeline */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Lead Pipeline
          </h2>
          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
            {leadStages.length} stages
          </Badge>
        </div>

        {/* Visual Pipeline Flow */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {leadStages.map((stage, index) => (
            <div key={stage.value} className="flex items-center">
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm">
                <div className={`h-2.5 w-2.5 rounded-full ${stage.color}`} />
                <span className="whitespace-nowrap text-xs font-medium text-gray-700">
                  {stage.label}
                </span>
              </div>
              {index < leadStages.length - 1 && (
                <ArrowRight className="mx-1 h-3 w-3 shrink-0 text-gray-300" />
              )}
            </div>
          ))}
        </div>

        {/* Stage Details */}
        <Card className="border border-gray-200">
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {leadStages.map((stage, index) => (
                <div
                  key={stage.value}
                  className="flex items-center gap-4 px-5 py-3"
                >
                  <span className="w-6 text-center text-xs font-medium text-gray-400">
                    {index + 1}
                  </span>
                  <div
                    className={`h-3 w-3 rounded-full ${stage.color}`}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {stage.label}
                    </p>
                    <p className="text-xs text-gray-500">
                      {stage.description}
                    </p>
                  </div>
                  <code className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                    {stage.value}
                  </code>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Deal Pipeline */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Deal Pipeline
          </h2>
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
            {dealStages.length} stages
          </Badge>
        </div>

        {/* Visual Pipeline Flow */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {dealStages.map((stage, index) => (
            <div key={stage.value} className="flex items-center">
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm">
                <div className={`h-2.5 w-2.5 rounded-full ${stage.color}`} />
                <span className="whitespace-nowrap text-xs font-medium text-gray-700">
                  {stage.label}
                </span>
              </div>
              {index < dealStages.length - 1 && (
                <ArrowRight className="mx-1 h-3 w-3 shrink-0 text-gray-300" />
              )}
            </div>
          ))}
        </div>

        {/* Stage Details */}
        <Card className="border border-gray-200">
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {dealStages.map((stage, index) => (
                <div
                  key={stage.value}
                  className="flex items-center gap-4 px-5 py-3"
                >
                  <span className="w-6 text-center text-xs font-medium text-gray-400">
                    {index + 1}
                  </span>
                  <div
                    className={`h-3 w-3 rounded-full ${stage.color}`}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {stage.label}
                    </p>
                    <p className="text-xs text-gray-500">
                      {stage.description}
                    </p>
                  </div>
                  <code className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                    {stage.value}
                  </code>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border border-amber-100 bg-amber-50/50 p-4">
        <p className="text-sm text-gray-600">
          <strong>Coming Soon:</strong> Custom pipeline stages with
          drag-and-drop reordering, custom colours, and the ability to create
          multiple pipelines for different property types.
        </p>
      </div>
    </div>
  );
}
