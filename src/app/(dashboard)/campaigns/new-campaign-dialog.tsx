"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCampaign } from "@/lib/actions/campaigns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus } from "lucide-react";

const channelOptions = [
  { value: "EMAIL", label: "Email" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "SMS", label: "SMS" },
  { value: "EMAIL_CAMPAIGN", label: "Email Campaign (Drip)" },
  { value: "SOCIAL_MEDIA", label: "Social Media" },
  { value: "PAID_SEARCH", label: "Paid Search" },
  { value: "DIRECT", label: "Direct" },
  { value: "ORGANIC", label: "Organic" },
  { value: "REFERRAL", label: "Referral" },
  { value: "PARTNER", label: "Partner" },
  { value: "EVENT", label: "Event" },
];

const statusOptions = [
  { value: "DRAFT", label: "Draft" },
  { value: "ACTIVE", label: "Active" },
  { value: "PAUSED", label: "Paused" },
  { value: "COMPLETED", label: "Completed" },
];

export default function NewCampaignDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [channel, setChannel] = useState("");
  const [status, setStatus] = useState("DRAFT");
  const [budget, setBudget] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");

  function resetForm() {
    setName("");
    setChannel("");
    setStatus("DRAFT");
    setBudget("");
    setStartDate("");
    setEndDate("");
    setDescription("");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Campaign name is required.");
      return;
    }

    if (!channel) {
      setError("Please select a channel (Email, WhatsApp, SMS, etc.).");
      return;
    }

    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      setError("End date cannot be before start date.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createCampaign({
        name: name.trim(),
        description: description.trim() || undefined,
        status: status as any,
        channel: channel as any,
        budget: budget ? parseFloat(budget) : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });

      resetForm();
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create campaign."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        setOpen(val);
        if (!val) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button className="gap-2 bg-[#dc2626] hover:bg-[#b91c1c] text-white">
          <Plus className="h-4 w-4" />
          New Campaign
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-gray-900">Create New Campaign</DialogTitle>
          <DialogDescription>
            Set up an Email, WhatsApp, or SMS campaign to reach your audience.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Campaign Name */}
          <div className="space-y-1.5">
            <Label htmlFor="campaign-name" className="text-sm font-medium text-gray-700">
              Campaign Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="campaign-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Summer Property Launch"
              className="bg-white"
            />
          </div>

          {/* Channel + Status row */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">
                Channel <span className="text-red-500">*</span>
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

            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Budget */}
          <div className="space-y-1.5">
            <Label htmlFor="campaign-budget" className="text-sm font-medium text-gray-700">
              Budget ($)
            </Label>
            <Input
              id="campaign-budget"
              type="number"
              min="0"
              step="0.01"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="0.00"
              className="bg-white"
            />
          </div>

          {/* Start / End date row */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="campaign-start" className="text-sm font-medium text-gray-700">
                Start Date
              </Label>
              <Input
                id="campaign-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="campaign-end" className="text-sm font-medium text-gray-700">
                End Date
              </Label>
              <Input
                id="campaign-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || undefined}
                className="bg-white"
              />
            </div>
          </div>

          {/* Description / Message Template */}
          <div className="space-y-1.5">
            <Label htmlFor="campaign-desc" className="text-sm font-medium text-gray-700">
              Message Template / Description
            </Label>
            <Textarea
              id="campaign-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Write your campaign message or describe the campaign goals, target audience, and strategy..."
              rows={4}
              className="bg-white"
            />
          </div>

          {/* Error message */}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#dc2626] hover:bg-[#b91c1c] text-white"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Campaign
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
