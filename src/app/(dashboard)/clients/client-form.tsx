"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  createClient,
  updateClient,
  type ClientFormData,
} from "@/lib/actions/clients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import type { Client } from "@prisma/client";

const clientSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  secondaryEmail: z.string().optional(),
  phone: z.string().min(1, "Phone is required"),
  whatsapp: z.string().optional(),
  address: z.string().optional(),
  nationality: z.string().min(1, "Nationality is required"),
  country: z.string().min(1, "Country is required"),
  city: z.string().optional(),
  area: z.string().optional(),
  verified: z.string().optional(),
  nextCallDate: z.string().optional(),
  priority: z.string().optional(),
  clientCategory: z.string().optional(),
  budgetMin: z.number().min(0, "Budget must be positive"),
  budgetMax: z.number().min(0, "Budget must be positive"),
  financeRequired: z.string().optional(),
  preferredPropertyType: z.string().optional(),
  investmentPurpose: z.string(),
  source: z.string(),
  referralSource: z.string().optional(),
  status: z.string(),
  propertyReference: z.string().optional(),
  bookingDate: z.string().optional(),
  bookingDetails: z.string().optional(),
  notes: z.string().optional(),
  assignedAgentId: z.string().optional(),
});

type FormData = z.infer<typeof clientSchema>;

interface Agent {
  id: string;
  firstName: string;
  lastName: string;
  office: string;
}

interface Property {
  id: string;
  name: string;
  pqtNumber: string;
}

interface ClientFormProps {
  agents: Agent[];
  properties: Property[];
  client?: Client & { assignedAgent?: { id: string } | null };
}

const nationalities = [
  "Bangladeshi",
  "British",
  "Emirati",
  "Indian",
  "Iranian",
  "Iraqi",
  "Kuwaiti",
  "Malaysian",
  "Pakistani",
  "Saudi",
  "Turkish",
  "Other",
];

const countries = [
  "Bangladesh",
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
  "Canada",
  "Australia",
  "Other",
];

const budgetRanges = [
  { value: "under-250k", label: "Under $250k" },
  { value: "250k-500k", label: "$250k - $500k" },
  { value: "500k-750k", label: "$500k - $750k" },
  { value: "750k-1m", label: "$750k - $1M" },
  { value: "1m-1.5m", label: "$1M - $1.5M" },
  { value: "1.5m-plus", label: "$1.5M+" },
];

const leadSources = [
  { value: "WEBSITE", label: "Website" },
  { value: "REFERRAL", label: "Referral" },
  { value: "SOCIAL_MEDIA", label: "Social Media" },
  { value: "GOOGLE_ADS", label: "Google Ads" },
  { value: "FACEBOOK_ADS", label: "Facebook Ads" },
  { value: "WALK_IN", label: "Walk-in" },
  { value: "PARTNER", label: "Partner" },
  { value: "EMAIL_CAMPAIGN", label: "Email Campaign" },
  { value: "OTHER", label: "Other" },
];

const clientStatuses = [
  { value: "NEW_LEAD", label: "Enquiry" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "QUALIFIED", label: "Qualified" },
  { value: "VIEWING_SCHEDULED", label: "Viewing Scheduled" },
  { value: "VIEWED", label: "Viewed" },
  { value: "NEGOTIATING", label: "Negotiating" },
  { value: "DEAL_CLOSED", label: "Deal Closed" },
  { value: "LOST", label: "Lost" },
  { value: "INACTIVE", label: "Inactive" },
];

const clientCategories = [
  { value: "FIRST_HOME_BUYER", label: "First Home Buyer" },
  { value: "SECOND_HOME_BUYER", label: "Second Home Buyer" },
  { value: "INVESTOR", label: "Investor" },
  { value: "DEVELOPER", label: "Developer" },
  { value: "CITIZENSHIP", label: "Citizenship Seeker" },
];

const priorities = [
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
];

export function ClientForm({ agents, properties, client }: ClientFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!client;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: client
      ? {
          firstName: client.firstName,
          lastName: client.lastName,
          email: client.email,
          phone: client.phone,
          whatsapp: client.whatsapp || "",
          nationality: client.nationality,
          country: client.country,
          city: client.city || "",
          budgetMin: Number(client.budgetMin),
          budgetMax: Number(client.budgetMax),
          preferredPropertyType: client.preferredPropertyType || "",
          investmentPurpose: client.investmentPurpose,
          source: client.source,
          status: client.status,
          notes: client.notes || "",
          assignedAgentId: client.assignedAgentId || "",
          priority: "MEDIUM",
          clientCategory: "SECOND_HOME_BUYER",
          verified: "No",
          financeRequired: "No",
        }
      : {
          status: "NEW_LEAD",
          source: "WEBSITE",
          investmentPurpose: "RESIDENTIAL",
          budgetMin: 200000,
          budgetMax: 500000,
          priority: "MEDIUM",
          clientCategory: "SECOND_HOME_BUYER",
          verified: "No",
          financeRequired: "No",
        },
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const formData: ClientFormData = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        whatsapp: data.whatsapp,
        nationality: data.nationality,
        country: data.country,
        city: data.city,
        budgetMin: data.budgetMin,
        budgetMax: data.budgetMax,
        notes: data.notes,
        assignedAgentId: data.assignedAgentId,
        preferredDistricts: [],
        preferredPropertyType:
          data.preferredPropertyType as ClientFormData["preferredPropertyType"],
        investmentPurpose:
          data.investmentPurpose as ClientFormData["investmentPurpose"],
        source: data.source as ClientFormData["source"],
        status: data.status as ClientFormData["status"],
      };

      if (isEditing) {
        await updateClient(client.id, formData);
        toast({
          title: "Client updated",
          description: "The client has been updated successfully.",
        });
      } else {
        await createClient(formData);
        toast({
          title: "Client created",
          description: "The client has been created successfully.",
        });
      }
      router.push("/clients");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error ? error.message : "Something went wrong",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Client Details */}
      <Card className="border border-gray-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold text-gray-900">
            Client Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label
                htmlFor="firstName"
                className="text-sm font-medium text-gray-700"
              >
                First Name *
              </Label>
              <Input
                id="firstName"
                {...register("firstName")}
                placeholder="Enter first name"
                className="bg-white"
              />
              {errors.firstName && (
                <p className="text-sm text-red-500">
                  {errors.firstName.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="lastName"
                className="text-sm font-medium text-gray-700"
              >
                Last Name *
              </Label>
              <Input
                id="lastName"
                {...register("lastName")}
                placeholder="Enter last name"
                className="bg-white"
              />
              {errors.lastName && (
                <p className="text-sm text-red-500">
                  {errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label
                htmlFor="email"
                className="text-sm font-medium text-gray-700"
              >
                Email *
              </Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                placeholder="primary@email.com"
                className="bg-white"
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="secondaryEmail"
                className="text-sm font-medium text-gray-700"
              >
                Secondary Email
              </Label>
              <Input
                id="secondaryEmail"
                type="email"
                {...register("secondaryEmail")}
                placeholder="secondary@email.com"
                className="bg-white"
              />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label
                htmlFor="phone"
                className="text-sm font-medium text-gray-700"
              >
                Telephone
              </Label>
              <Input
                id="phone"
                {...register("phone")}
                placeholder="+123-456-7890"
                className="bg-white"
              />
              {errors.phone && (
                <p className="text-sm text-red-500">{errors.phone.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="whatsapp"
                className="text-sm font-medium text-gray-700"
              >
                Mobile *
              </Label>
              <Input
                id="whatsapp"
                {...register("whatsapp")}
                placeholder="+123-456-7890"
                className="bg-white"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="address"
              className="text-sm font-medium text-gray-700"
            >
              Address
            </Label>
            <Input
              id="address"
              {...register("address")}
              placeholder="Street address"
              className="bg-white"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">
                Origin Country *
              </Label>
              <Select
                value={watch("country")}
                onValueChange={(value) => setValue("country", value)}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country} value={country}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.country && (
                <p className="text-sm text-red-500">{errors.country.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="city"
                className="text-sm font-medium text-gray-700"
              >
                City
              </Label>
              <Input
                id="city"
                {...register("city")}
                placeholder="City name"
                className="bg-white"
              />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label
                htmlFor="area"
                className="text-sm font-medium text-gray-700"
              >
                Area
              </Label>
              <Input
                id="area"
                {...register("area")}
                placeholder="Area/District"
                className="bg-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">
                Verified
              </Label>
              <Select
                value={watch("verified")}
                onValueChange={(value) => setValue("verified", value)}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="No" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lead Management */}
      <Card className="border border-gray-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold text-gray-900">
            Lead Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label
                htmlFor="nextCallDate"
                className="text-sm font-medium text-gray-700"
              >
                Next Call Date
              </Label>
              <Input
                id="nextCallDate"
                type="date"
                {...register("nextCallDate")}
                className="bg-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">
                Priority *
              </Label>
              <Select
                value={watch("priority")}
                onValueChange={(value) => setValue("priority", value)}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Medium" />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">
                Client Category *
              </Label>
              <Select
                value={watch("clientCategory")}
                onValueChange={(value) => setValue("clientCategory", value)}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Second Home Buyer" />
                </SelectTrigger>
                <SelectContent>
                  {clientCategories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">
                Client Status *
              </Label>
              <Select
                value={watch("status")}
                onValueChange={(value) => setValue("status", value)}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Enquiry" />
                </SelectTrigger>
                <SelectContent>
                  {clientStatuses.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">
                Source of Enquiry *
              </Label>
              <Select
                value={watch("source")}
                onValueChange={(value) => setValue("source", value)}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Website" />
                </SelectTrigger>
                <SelectContent>
                  {leadSources.map((source) => (
                    <SelectItem key={source.value} value={source.value}>
                      {source.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="referralSource"
                className="text-sm font-medium text-gray-700"
              >
                Referral Source
              </Label>
              <Input
                id="referralSource"
                {...register("referralSource")}
                placeholder="e.g., REF: PTFS5545"
                className="bg-white"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Budget & Finance */}
      <Card className="border border-gray-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold text-gray-900">
            Budget & Finance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">
                Maximum Budget *
              </Label>
              <Select
                value={(() => {
                  const max = watch("budgetMax");
                  if (max <= 250000) return "under-250k";
                  if (max <= 500000) return "250k-500k";
                  if (max <= 750000) return "500k-750k";
                  if (max <= 1000000) return "750k-1m";
                  if (max <= 1500000) return "1m-1.5m";
                  return "1.5m-plus";
                })()}
                onValueChange={(value) => {
                  const budgetMap: Record<string, [number, number]> = {
                    "under-250k": [0, 250000],
                    "250k-500k": [250000, 500000],
                    "500k-750k": [500000, 750000],
                    "750k-1m": [750000, 1000000],
                    "1m-1.5m": [1000000, 1500000],
                    "1.5m-plus": [1500000, 5000000],
                  };
                  const range = budgetMap[value];
                  if (range) {
                    setValue("budgetMin", range[0]);
                    setValue("budgetMax", range[1]);
                  }
                }}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Select budget range" />
                </SelectTrigger>
                <SelectContent>
                  {budgetRanges.map((range) => (
                    <SelectItem key={range.value} value={range.value}>
                      {range.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">
                Finance Required
              </Label>
              <Select
                value={watch("financeRequired")}
                onValueChange={(value) => setValue("financeRequired", value)}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="No" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Property & Booking Details */}
      <Card className="border border-gray-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold text-gray-900">
            Property & Booking Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">
                Specific Property Reference
              </Label>
              <Select
                value={watch("propertyReference") || ""}
                onValueChange={(value) => setValue("propertyReference", value)}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((property) => (
                    <SelectItem key={property.id} value={property.pqtNumber}>
                      {property.name} ({property.pqtNumber})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="bookingDate"
                className="text-sm font-medium text-gray-700"
              >
                Booking Date
              </Label>
              <Input
                id="bookingDate"
                type="date"
                {...register("bookingDate")}
                className="bg-white"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="bookingDetails"
              className="text-sm font-medium text-gray-700"
            >
              Booking Details
            </Label>
            <Textarea
              id="bookingDetails"
              {...register("bookingDetails")}
              placeholder="Enter booking details..."
              rows={4}
              className="bg-white"
            />
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
          {isEditing ? "Update Lead" : "Create Lead"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
