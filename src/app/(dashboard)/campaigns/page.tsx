import { auth, type ExtendedSession } from "@/lib/auth";
import { getCampaigns, getCampaignStats } from "@/lib/actions/campaigns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Megaphone } from "lucide-react";
import NewCampaignDialog from "./new-campaign-dialog";

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  ACTIVE: "bg-emerald-100 text-emerald-700",
  PAUSED: "bg-yellow-100 text-yellow-700",
  COMPLETED: "bg-blue-100 text-blue-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const channelLabels: Record<string, string> = {
  EMAIL: "Email",
  WHATSAPP: "WhatsApp",
  SMS: "SMS",
  EMAIL_CAMPAIGN: "Email Campaign",
  SOCIAL_MEDIA: "Social Media",
  PAID_SEARCH: "Paid Search",
  DIRECT: "Direct",
  ORGANIC: "Organic",
  REFERRAL: "Referral",
  PARTNER: "Partner",
  EVENT: "Event",
};

export default async function CampaignsPage() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) return null;

  const [{ campaigns, total }, stats] = await Promise.all([
    getCampaigns({ limit: 50 }),
    getCampaignStats(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pink-100">
            <Megaphone className="h-5 w-5 text-pink-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
            <p className="text-gray-500">Manage marketing campaigns and track ROI</p>
          </div>
        </div>
        {["SUPER_ADMIN", "ADMIN"].includes(session.user.role) && (
          <NewCampaignDialog />
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border border-gray-200">
          <CardContent className="p-5">
            <p className="text-sm text-gray-500">Active Campaigns</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{stats.activeCampaigns}</p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200">
          <CardContent className="p-5">
            <p className="text-sm text-gray-500">Leads Generated</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{stats.totalLeads}</p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200">
          <CardContent className="p-5">
            <p className="text-sm text-gray-500">Conversions</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">{stats.totalConversions}</p>
            <p className="text-xs text-gray-500">{stats.conversionRate}% rate</p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200">
          <CardContent className="p-5">
            <p className="text-sm text-gray-500">Total Spent</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">${stats.totalSpent.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-gray-200">
        <CardContent className="p-0">
          {campaigns.length === 0 ? (
            <div className="py-12 text-center">
              <Megaphone className="mx-auto mb-4 h-12 w-12 text-gray-300" />
              <p className="text-gray-500">No campaigns yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-gray-100 bg-gray-50/50">
                  <TableHead className="text-xs font-medium text-gray-500">Campaign</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">Status</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">Channel</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">Budget</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">Leads</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">Conversions</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">Dates</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((campaign) => (
                  <TableRow key={campaign.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <TableCell>
                      <p className="text-sm font-medium text-gray-900">{campaign.name}</p>
                      {campaign.description && (
                        <p className="text-xs text-gray-500 line-clamp-1">{campaign.description}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[campaign.status]}>{campaign.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {campaign.channel
                        ? channelLabels[campaign.channel] || campaign.channel.replace(/_/g, " ")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {campaign.budget ? `$${Number(campaign.budget).toLocaleString()}` : "—"}
                    </TableCell>
                    <TableCell className="text-sm font-medium text-gray-900">
                      {campaign.leadsGenerated}
                    </TableCell>
                    <TableCell className="text-sm font-medium text-emerald-600">
                      {campaign.conversions}
                    </TableCell>
                    <TableCell className="text-xs text-gray-500">
                      {campaign.startDate ? new Date(campaign.startDate).toLocaleDateString() : "—"}
                      {campaign.endDate ? ` — ${new Date(campaign.endDate).toLocaleDateString()}` : ""}
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
