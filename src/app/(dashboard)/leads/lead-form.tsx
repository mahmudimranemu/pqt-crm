"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createLead } from "@/lib/actions/leads";
import { createQuickClient } from "@/lib/actions/clients";
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
import { Loader2, UserPlus, Users, Search } from "lucide-react";

const leadSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  estimatedValue: z.number().min(0).optional(),
  currency: z.string().optional(),
  budgetRange: z.string().optional(),
  source: z.string().optional(),
  sourceChannel: z.string().optional(),
  sourceDetail: z.string().optional(),
  propertyType: z.string().optional(),
  preferredLocation: z.string().optional(),
  clientId: z.string().min(1, "Client is required"),
  ownerId: z.string().optional(),
});

type FormData = z.infer<typeof leadSchema>;

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface Agent {
  id: string;
  firstName: string;
  lastName: string;
  office: string;
}

interface LeadFormProps {
  clients: Client[];
  agents: Agent[];
}

const sourceChannels = [
  { value: "ORGANIC", label: "Organic" },
  { value: "PAID_SEARCH", label: "Paid Search" },
  { value: "SOCIAL_MEDIA", label: "Social Media" },
  { value: "REFERRAL", label: "Referral" },
  { value: "DIRECT", label: "Direct" },
  { value: "EMAIL_CAMPAIGN", label: "Email Campaign" },
  { value: "PARTNER", label: "Partner" },
  { value: "EVENT", label: "Event" },
];

const leadSources = [
  { value: "WEBSITE", label: "Website" },
  { value: "REFERRAL", label: "Referral" },
  { value: "SOCIAL_MEDIA", label: "Social Media" },
  { value: "GOOGLE_ADS", label: "Google Ads" },
  { value: "FACEBOOK_ADS", label: "Facebook Ads" },
  { value: "WALK_IN", label: "Walk-in" },
  { value: "PARTNER", label: "Partner" },
  { value: "OTHER", label: "Other" },
];

const budgetRanges = [
  { value: "UNDER_100K", label: "Under $100K" },
  { value: "FROM_100K_TO_250K", label: "$100K - $250K" },
  { value: "FROM_250K_TO_500K", label: "$250K - $500K" },
  { value: "FROM_500K_TO_1M", label: "$500K - $1M" },
  { value: "OVER_1M", label: "Over $1M" },
];

const propertyTypes = [
  { value: "APARTMENT", label: "Apartment" },
  { value: "VILLA", label: "Villa" },
  { value: "COMMERCIAL", label: "Commercial" },
  { value: "LAND", label: "Land" },
  { value: "PENTHOUSE", label: "Penthouse" },
];

const currencies = [
  { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR" },
  { value: "GBP", label: "GBP" },
  { value: "TRY", label: "TRY" },
  { value: "AED", label: "AED" },
];

export function LeadForm({ clients: initialClients, agents }: LeadFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientMode, setClientMode] = useState<"existing" | "new">("existing");
  const [clientSearch, setClientSearch] = useState("");
  const [clients, setClients] = useState(initialClients);
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [newClient, setNewClient] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    nationality: "",
    country: "",
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      currency: "USD",
      source: "WEBSITE",
      sourceChannel: "ORGANIC",
    },
  });

  const selectedClientId = watch("clientId");

  const filteredClients = clientSearch
    ? clients.filter(
        (c) =>
          `${c.firstName} ${c.lastName}`
            .toLowerCase()
            .includes(clientSearch.toLowerCase()) ||
          c.email.toLowerCase().includes(clientSearch.toLowerCase()) ||
          c.phone.includes(clientSearch),
      )
    : clients;

  const handleCreateClient = async () => {
    if (
      !newClient.firstName ||
      !newClient.lastName ||
      !newClient.email ||
      !newClient.phone
    ) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Please fill in first name, last name, email, and phone.",
      });
      return;
    }

    setIsCreatingClient(true);
    try {
      const client = await createQuickClient({
        firstName: newClient.firstName,
        lastName: newClient.lastName,
        email: newClient.email,
        phone: newClient.phone,
        nationality: newClient.nationality || "Not specified",
        country: newClient.country || "Not specified",
      });
      // Add to list and select
      setClients((prev) => [
        {
          id: client.id,
          firstName: client.firstName,
          lastName: client.lastName,
          email: client.email,
          phone: client.phone,
        },
        ...prev,
      ]);
      setValue("clientId", client.id);
      setClientMode("existing");
      setNewClient({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        nationality: "",
        country: "",
      });
      toast({
        title: "Client created",
        description: `${client.firstName} ${client.lastName} has been created and selected.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to create client",
      });
    } finally {
      setIsCreatingClient(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const isPool = data.ownerId?.startsWith("POOL_");
      const result = await createLead({
        title: data.title,
        description: data.description,
        estimatedValue: data.estimatedValue,
        currency: data.currency as "USD" | "EUR" | "GBP" | "TRY" | "AED",
        budgetRange: data.budgetRange as
          | "UNDER_100K"
          | "FROM_100K_TO_250K"
          | "FROM_250K_TO_500K"
          | "FROM_500K_TO_1M"
          | "OVER_1M"
          | undefined,
        source: data.source as
          | "WEBSITE"
          | "REFERRAL"
          | "SOCIAL_MEDIA"
          | "GOOGLE_ADS"
          | "FACEBOOK_ADS"
          | "WALK_IN"
          | "PARTNER"
          | "OTHER"
          | undefined,
        sourceChannel: data.sourceChannel as
          | "ORGANIC"
          | "PAID_SEARCH"
          | "SOCIAL_MEDIA"
          | "REFERRAL"
          | "DIRECT"
          | "EMAIL_CAMPAIGN"
          | "PARTNER"
          | "EVENT"
          | undefined,
        sourceDetail: data.sourceDetail,
        propertyType: data.propertyType as
          | "APARTMENT"
          | "VILLA"
          | "COMMERCIAL"
          | "LAND"
          | "PENTHOUSE"
          | undefined,
        preferredLocation: data.preferredLocation,
        clientId: data.clientId,
        ownerId: isPool ? undefined : data.ownerId || undefined,
      });
      if (isPool && result?.id) {
        const { assignLeadToPool } = await import("@/lib/actions/leads");
        await assignLeadToPool(
          result.id,
          data.ownerId as "POOL_1" | "POOL_2" | "POOL_3",
        );
      }
      toast({
        title: "Lead created",
        description: "The lead has been created successfully.",
      });
      router.push("/leads");
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

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Client Selection */}
      <Card className="border border-gray-200">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-gray-900">
              Client
            </CardTitle>
            <div className="flex rounded-lg border border-gray-200 bg-white">
              <button
                type="button"
                onClick={() => setClientMode("existing")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-l-lg transition-colors ${
                  clientMode === "existing"
                    ? "bg-[#dc2626] text-white"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                Existing
              </button>
              <button
                type="button"
                onClick={() => setClientMode("new")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-r-lg transition-colors ${
                  clientMode === "new"
                    ? "bg-[#dc2626] text-white"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <UserPlus className="h-3.5 w-3.5" />
                New Client
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {clientMode === "existing" ? (
            <>
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  placeholder="Search clients by name, email, or phone..."
                  className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-[#dc2626] focus:outline-none focus:ring-1 focus:ring-[#dc2626]"
                />
              </div>

              {/* Selected client display */}
              {selectedClient && (
                <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
                    {selectedClient.firstName.charAt(0)}
                    {selectedClient.lastName.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {selectedClient.firstName} {selectedClient.lastName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {selectedClient.email} &middot; {selectedClient.phone}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setValue("clientId", "")}
                    className="text-xs text-gray-400 hover:text-red-500"
                  >
                    Change
                  </button>
                </div>
              )}

              {/* Client list */}
              {!selectedClient && (
                <div className="max-h-[240px] overflow-y-auto rounded-lg border border-gray-200">
                  {filteredClients.length === 0 ? (
                    <div className="p-6 text-center">
                      <p className="text-sm text-gray-500">No clients found.</p>
                      <button
                        type="button"
                        onClick={() => setClientMode("new")}
                        className="mt-2 text-sm font-medium text-[#dc2626] hover:underline"
                      >
                        Create a new client
                      </button>
                    </div>
                  ) : (
                    filteredClients.map((client) => (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() => setValue("clientId", client.id)}
                        className="flex w-full items-center gap-3 border-b border-gray-100 p-3 text-left hover:bg-gray-50 last:border-0 transition-colors"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 text-xs font-semibold">
                          {client.firstName.charAt(0)}
                          {client.lastName.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {client.firstName} {client.lastName}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {client.email} &middot; {client.phone}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
              {errors.clientId && !selectedClient && (
                <p className="text-sm text-red-500">
                  {errors.clientId.message}
                </p>
              )}
            </>
          ) : (
            /* New Client Form */
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">
                    First Name *
                  </Label>
                  <Input
                    value={newClient.firstName}
                    onChange={(e) =>
                      setNewClient((p) => ({ ...p, firstName: e.target.value }))
                    }
                    placeholder="First name"
                    className="bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">
                    Last Name *
                  </Label>
                  <Input
                    value={newClient.lastName}
                    onChange={(e) =>
                      setNewClient((p) => ({ ...p, lastName: e.target.value }))
                    }
                    placeholder="Last name"
                    className="bg-white"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">
                    Email *
                  </Label>
                  <Input
                    type="email"
                    value={newClient.email}
                    onChange={(e) =>
                      setNewClient((p) => ({ ...p, email: e.target.value }))
                    }
                    placeholder="email@example.com"
                    className="bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">
                    Phone *
                  </Label>
                  <Input
                    value={newClient.phone}
                    onChange={(e) =>
                      setNewClient((p) => ({ ...p, phone: e.target.value }))
                    }
                    placeholder="+1 234 567 890"
                    className="bg-white"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">
                    Nationality
                  </Label>
                  <Input
                    value={newClient.nationality}
                    onChange={(e) =>
                      setNewClient((p) => ({
                        ...p,
                        nationality: e.target.value,
                      }))
                    }
                    placeholder="e.g., British"
                    className="bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">
                    Country
                  </Label>
                  <Input
                    value={newClient.country}
                    onChange={(e) =>
                      setNewClient((p) => ({ ...p, country: e.target.value }))
                    }
                    placeholder="e.g., United Kingdom"
                    className="bg-white"
                  />
                </div>
              </div>
              <Button
                type="button"
                onClick={handleCreateClient}
                disabled={isCreatingClient}
                className="bg-[#dc2626] hover:bg-[#b91c1c] text-white"
              >
                {isCreatingClient && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                <UserPlus className="mr-2 h-4 w-4" />
                Create & Select Client
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lead Details */}
      <Card className="border border-gray-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold text-gray-900">
            Lead Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label
              htmlFor="title"
              className="text-sm font-medium text-gray-700"
            >
              Lead Title *
            </Label>
            <Input
              id="title"
              {...register("title")}
              placeholder="e.g., 3-bed apartment in Kadikoy"
              className="bg-white"
            />
            {errors.title && (
              <p className="text-sm text-red-500">{errors.title.message}</p>
            )}
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
              {...register("description")}
              placeholder="Additional details about this lead..."
              rows={3}
              className="bg-white"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">
              Assign To
            </Label>
            <Select
              value={watch("ownerId") || ""}
              onValueChange={(value) => setValue("ownerId", value)}
            >
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Auto-assign to me" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="POOL_1">Pool 1</SelectItem>
                <SelectItem value="POOL_2">Pool 2</SelectItem>
                <SelectItem value="POOL_3">Pool 3</SelectItem>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.firstName} {agent.lastName} ({agent.office})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Property Preferences */}
      <Card className="border border-gray-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold text-gray-900">
            Property Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">
                Property Type
              </Label>
              <Select
                value={watch("propertyType") || ""}
                onValueChange={(value) => setValue("propertyType", value)}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {propertyTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="preferredLocation"
                className="text-sm font-medium text-gray-700"
              >
                Preferred Location
              </Label>
              <Input
                id="preferredLocation"
                {...register("preferredLocation")}
                placeholder="e.g., Kadikoy, Istanbul"
                className="bg-white"
              />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">
                Budget Range
              </Label>
              <Select
                value={watch("budgetRange") || ""}
                onValueChange={(value) => setValue("budgetRange", value)}
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
                Estimated Value
              </Label>
              <div className="flex gap-2">
                <Select
                  value={watch("currency") || "USD"}
                  onValueChange={(value) => setValue("currency", value)}
                >
                  <SelectTrigger className="bg-white w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  {...register("estimatedValue", { valueAsNumber: true })}
                  placeholder="0"
                  className="bg-white flex-1"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Source Information */}
      <Card className="border border-gray-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold text-gray-900">
            Source Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">
                Lead Source
              </Label>
              <Select
                value={watch("source") || "WEBSITE"}
                onValueChange={(value) => setValue("source", value)}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Select source" />
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
              <Label className="text-sm font-medium text-gray-700">
                Source Channel
              </Label>
              <Select
                value={watch("sourceChannel") || "ORGANIC"}
                onValueChange={(value) => setValue("sourceChannel", value)}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Select channel" />
                </SelectTrigger>
                <SelectContent>
                  {sourceChannels.map((ch) => (
                    <SelectItem key={ch.value} value={ch.value}>
                      {ch.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="sourceDetail"
              className="text-sm font-medium text-gray-700"
            >
              Source Details
            </Label>
            <Input
              id="sourceDetail"
              {...register("sourceDetail")}
              placeholder="e.g., Campaign name, referral code"
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
          Create Lead
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
