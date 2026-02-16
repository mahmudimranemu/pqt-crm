"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { Plus, ChevronDown, Loader2 } from "lucide-react";
import { createEnquiry } from "@/lib/actions/enquiries";

interface Agent {
  id: string;
  firstName: string;
  lastName: string;
}

interface Property {
  id: string;
  name: string;
  pqtNumber: string;
}

interface AddEnquiryDialogProps {
  agents: Agent[];
  properties: Property[];
}

const sources = [
  { value: "WEBSITE_FORM", label: "Website Form" },
  { value: "PHONE_CALL", label: "Phone Call" },
  { value: "EMAIL", label: "Email" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "LIVE_CHAT", label: "Live Chat" },
  { value: "PARTNER_REFERRAL", label: "Partner Referral" },
];

const countries = [
  "Bangladesh",
  "Canada",
  "India",
  "Iran",
  "Iraq",
  "Kuwait",
  "Malaysia",
  "Pakistan",
  "Saudi Arabia",
  "Turkey",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
  "Other",
];

const initialFormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  message: "",
  source: "WEBSITE_FORM",
  budget: "",
  country: "",
  segment: "Buyer",
  priority: "Medium",
  assignedAgentId: "",
  interestedPropertyId: "",
};

export function AddEnquiryDialog({
  agents,
  properties,
}: AddEnquiryDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState(initialFormState);

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!form.firstName || !form.lastName || !form.email || !form.phone) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Please fill in first name, last name, email, and phone.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const isPool = form.assignedAgentId.startsWith("POOL_");
      const result = await createEnquiry({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        message: form.message || undefined,
        source: form.source,
        budget: form.budget || undefined,
        country: form.country || undefined,
        segment: form.segment,
        priority: form.priority,
        assignedAgentId: isPool ? undefined : form.assignedAgentId || undefined,
        interestedPropertyId: form.interestedPropertyId || undefined,
      });
      if (isPool && result?.id) {
        const { assignEnquiryToPool } = await import("@/lib/actions/enquiries");
        await assignEnquiryToPool(
          result.id,
          form.assignedAgentId as "POOL_1" | "POOL_2" | "POOL_3",
        );
      }
      toast({
        title: "Enquiry created",
        description: `Enquiry for ${form.firstName} ${form.lastName} has been created.`,
      });
      setForm(initialFormState);
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to create enquiry",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="gap-2 bg-[#dc2626] hover:bg-[#b91c1c] text-white"
      >
        <Plus className="h-4 w-4" />
        New Lead
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Enquiry</DialogTitle>
            <DialogDescription>
              Create a new lead by filling in the enquiry details below.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Contact Info */}
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Contact Information
              </p>
              <div className="h-px bg-gray-100" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm">
                  First Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="First name"
                  value={form.firstName}
                  onChange={(e) => updateField("firstName", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">
                  Last Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="Last name"
                  value={form.lastName}
                  onChange={(e) => updateField("lastName", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">
                  Phone <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="+1 234 567 890"
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                />
              </div>
            </div>

            {/* Enquiry Details */}
            <div className="space-y-1 pt-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Enquiry Details
              </p>
              <div className="h-px bg-gray-100" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm">Source</Label>
                <Select
                  value={form.source}
                  onValueChange={(val) => updateField("source", val)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sources.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Country</Label>
                <Select
                  value={form.country}
                  onValueChange={(val) => updateField("country", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm">Budget</Label>
                <Input
                  placeholder="e.g. $200k - $500k"
                  value={form.budget}
                  onChange={(e) => updateField("budget", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Segment</Label>
                <Select
                  value={form.segment}
                  onValueChange={(val) => updateField("segment", val)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Buyer">Buyer</SelectItem>
                    <SelectItem value="Investor">Investor</SelectItem>
                    <SelectItem value="Tenant">Tenant</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Message</Label>
              <Textarea
                placeholder="Enquiry message or notes..."
                value={form.message}
                onChange={(e) => updateField("message", e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>

            {/* Assignment */}
            <div className="space-y-1 pt-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Assignment
              </p>
              <div className="h-px bg-gray-100" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm">Priority</Label>
                <Select
                  value={form.priority}
                  onValueChange={(val) => updateField("priority", val)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Assign Consultant</Label>
                <Select
                  value={form.assignedAgentId}
                  onValueChange={(val) => updateField("assignedAgentId", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="POOL_1">Pool 1</SelectItem>
                    <SelectItem value="POOL_2">Pool 2</SelectItem>
                    <SelectItem value="POOL_3">Pool 3</SelectItem>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.firstName} {agent.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Interested Property</Label>
              <Select
                value={form.interestedPropertyId}
                onValueChange={(val) =>
                  updateField("interestedPropertyId", val)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select property (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((prop) => (
                    <SelectItem key={prop.id} value={prop.id}>
                      {prop.name} ({prop.pqtNumber})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-[#dc2626] hover:bg-[#b91c1c] text-white"
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Enquiry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
