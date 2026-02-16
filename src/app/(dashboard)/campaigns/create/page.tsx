"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createCampaign } from "@/lib/actions/campaigns";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";

const sourceOptions = [
  { value: "WEBSITE", label: "Website" },
  { value: "REFERRAL", label: "Referral" },
  { value: "SOCIAL_MEDIA", label: "Social Media" },
  { value: "GOOGLE_ADS", label: "Google Ads" },
  { value: "FACEBOOK_ADS", label: "Facebook Ads" },
  { value: "WALK_IN", label: "Walk-In" },
  { value: "PARTNER", label: "Partner" },
  { value: "OTHER", label: "Other" },
];

const channelOptions = [
  { value: "ORGANIC", label: "Organic" },
  { value: "PAID_SEARCH", label: "Paid Search" },
  { value: "SOCIAL_MEDIA", label: "Social Media" },
  { value: "REFERRAL", label: "Referral" },
  { value: "DIRECT", label: "Direct" },
  { value: "EMAIL_CAMPAIGN", label: "Email Campaign" },
  { value: "PARTNER", label: "Partner" },
  { value: "EVENT", label: "Event" },
];

export default function CreateCampaignPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [source, setSource] = useState("");
  const [channel, setChannel] = useState("");
  const [budget, setBudget] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({
        variant: "destructive",
        title: "Validation error",
        description: "Campaign name is required.",
      });
      return;
    }

    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      toast({
        variant: "destructive",
        title: "Validation error",
        description: "End date cannot be before start date.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await createCampaign({
        name: name.trim(),
        description: description.trim() || undefined,
        source: source ? (source as any) : undefined,
        channel: channel ? (channel as any) : undefined,
        budget: budget ? parseFloat(budget) : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });

      toast({
        title: "Campaign created",
        description: "The campaign has been created successfully.",
      });

      router.push("/campaigns");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to create campaign.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/campaigns"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Campaigns
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Create Campaign</h1>
        <p className="text-gray-500">
          Set up a new marketing campaign to track leads and conversions
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Campaign Details */}
        <Card className="border border-gray-200">
          <CardContent className="p-6 space-y-5">
            <div className="space-y-1.5">
              <Label
                htmlFor="name"
                className="text-sm font-medium text-gray-700"
              >
                Campaign Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Summer 2026 Launch"
                required
                className="bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="description"
                className="text-sm font-medium text-gray-700"
              >
                Description
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the campaign goals, target audience, and strategy..."
                rows={3}
                className="bg-white"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700">
                  Source
                </Label>
                <Select value={source} onValueChange={setSource}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select lead source" />
                  </SelectTrigger>
                  <SelectContent>
                    {sourceOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700">
                  Channel
                </Label>
                <Select value={channel} onValueChange={setChannel}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select channel" />
                  </SelectTrigger>
                  <SelectContent>
                    {channelOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="budget"
                className="text-sm font-medium text-gray-700"
              >
                Budget ($)
              </Label>
              <Input
                id="budget"
                type="number"
                min="0"
                step="0.01"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="0.00"
                className="bg-white sm:max-w-xs"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label
                  htmlFor="startDate"
                  className="text-sm font-medium text-gray-700"
                >
                  Start Date
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="endDate"
                  className="text-sm font-medium text-gray-700"
                >
                  End Date
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate || undefined}
                  className="bg-white"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-[#dc2626] hover:bg-[#b91c1c] text-white"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Campaign
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/campaigns")}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
