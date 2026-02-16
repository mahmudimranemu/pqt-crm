"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { convertToClientAndLead } from "@/lib/actions/enquiries";
import { ArrowRightLeft, UserPlus, Target, Loader2 } from "lucide-react";

interface ConvertEnquiryDialogProps {
  enquiryId: string;
  enquiryName: string;
  enquiryBudget: string | null;
  enquiryCountry: string | null;
  enquiryMessage: string | null;
  disabled?: boolean;
}

export function ConvertEnquiryDialog({
  enquiryId,
  enquiryName,
  enquiryBudget,
  enquiryCountry,
  enquiryMessage,
  disabled,
}: ConvertEnquiryDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  // Client fields
  const [nationality, setNationality] = useState(enquiryCountry || "");
  const [country, setCountry] = useState(enquiryCountry || "");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [investmentPurpose, setInvestmentPurpose] = useState("RESIDENTIAL");

  // Lead fields
  const [leadTitle, setLeadTitle] = useState(
    `${enquiryName} - New Opportunity`,
  );
  const [estimatedValue, setEstimatedValue] = useState(enquiryBudget || "");
  const [budgetRange, setBudgetRange] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [preferredLocation, setPreferredLocation] = useState("");
  const [description, setDescription] = useState(enquiryMessage || "");

  function handleSubmit() {
    if (!leadTitle.trim()) {
      setError("Lead title is required");
      return;
    }

    setError("");
    startTransition(async () => {
      try {
        const result = await convertToClientAndLead(enquiryId, {
          nationality: nationality || undefined,
          country: country || undefined,
          budgetMin: budgetMin ? Number(budgetMin) : undefined,
          budgetMax: budgetMax ? Number(budgetMax) : undefined,
          investmentPurpose: investmentPurpose || undefined,
          leadTitle: leadTitle.trim(),
          estimatedValue: estimatedValue ? Number(estimatedValue) : undefined,
          budgetRange: (budgetRange || undefined) as any,
          propertyType: (propertyType || undefined) as any,
          preferredLocation: preferredLocation || undefined,
          description: description || undefined,
        });

        setOpen(false);
        router.push(`/leads/${result.lead.id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Conversion failed");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className="bg-[#dc2626] hover:bg-[#b91c1c] text-white"
          disabled={disabled}
        >
          <ArrowRightLeft className="mr-2 h-4 w-4" />
          Convert to Client & Lead
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-[#dc2626]" />
            Convert Enquiry
          </DialogTitle>
          <DialogDescription>
            This will create a <strong>Client</strong> record and a{" "}
            <strong>Lead</strong> in the pipeline for {enquiryName}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Client Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <UserPlus className="h-4 w-4 text-[#dc2626]" />
              <h3 className="font-semibold text-sm text-gray-900">
                Client Details
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nationality">Nationality</Label>
                <Input
                  id="nationality"
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  placeholder="e.g. Turkish"
                />
              </div>
              <div>
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="e.g. Turkey"
                />
              </div>
              <div>
                <Label htmlFor="budgetMin">Budget Min ($)</Label>
                <Input
                  id="budgetMin"
                  type="number"
                  value={budgetMin}
                  onChange={(e) => setBudgetMin(e.target.value)}
                  placeholder="200000"
                />
              </div>
              <div>
                <Label htmlFor="budgetMax">Budget Max ($)</Label>
                <Input
                  id="budgetMax"
                  type="number"
                  value={budgetMax}
                  onChange={(e) => setBudgetMax(e.target.value)}
                  placeholder="500000"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="investmentPurpose">Investment Purpose</Label>
                <select
                  id="investmentPurpose"
                  value={investmentPurpose}
                  onChange={(e) => setInvestmentPurpose(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="RESIDENTIAL">Residential</option>
                  <option value="INVESTMENT">Investment</option>
                  <option value="CITIZENSHIP">Citizenship</option>
                  <option value="COMMERCIAL">Commercial</option>
                </select>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200" />

          {/* Lead Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Target className="h-4 w-4 text-[#dc2626]" />
              <h3 className="font-semibold text-sm text-gray-900">
                Lead Details
              </h3>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="leadTitle">
                  Lead Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="leadTitle"
                  value={leadTitle}
                  onChange={(e) => setLeadTitle(e.target.value)}
                  placeholder="e.g. John Smith - Villa in Beylikduzu"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="estimatedValue">Estimated Value ($)</Label>
                  <Input
                    id="estimatedValue"
                    type="number"
                    value={estimatedValue}
                    onChange={(e) => setEstimatedValue(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="budgetRange">Budget Range</Label>
                  <select
                    id="budgetRange"
                    value={budgetRange}
                    onChange={(e) => setBudgetRange(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Select range</option>
                    <option value="UNDER_100K">Under $100K</option>
                    <option value="FROM_100K_TO_250K">$100K - $250K</option>
                    <option value="FROM_250K_TO_500K">$250K - $500K</option>
                    <option value="FROM_500K_TO_1M">$500K - $1M</option>
                    <option value="OVER_1M">Over $1M</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="propertyType">Property Type</Label>
                  <select
                    id="propertyType"
                    value={propertyType}
                    onChange={(e) => setPropertyType(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Select type</option>
                    <option value="APARTMENT">Apartment</option>
                    <option value="VILLA">Villa</option>
                    <option value="COMMERCIAL">Commercial</option>
                    <option value="LAND">Land</option>
                    <option value="PENTHOUSE">Penthouse</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="preferredLocation">Preferred Location</Label>
                  <Input
                    id="preferredLocation"
                    value={preferredLocation}
                    onChange={(e) => setPreferredLocation(e.target.value)}
                    placeholder="e.g. Beylikduzu, Istanbul"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Additional notes about this opportunity..."
                  rows={3}
                />
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            className="bg-[#dc2626] hover:bg-[#b91c1c] text-white"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Converting...
              </>
            ) : (
              <>
                <ArrowRightLeft className="mr-2 h-4 w-4" />
                Convert
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
