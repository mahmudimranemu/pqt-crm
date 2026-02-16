"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createDeal } from "@/lib/actions/deals";
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

const dealSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  dealValue: z.number().min(1, "Deal value is required"),
  currency: z.string().optional(),
  stage: z.string().optional(),
  propertyType: z.string().optional(),
  propertyName: z.string().optional(),
  unitNumber: z.string().optional(),
  expectedCloseDate: z.string().optional(),
  clientId: z.string().min(1, "Client is required"),
  ownerId: z.string().optional(),
});

type FormData = z.infer<typeof dealSchema>;

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

interface DealFormProps {
  clients: Client[];
  agents: Agent[];
}

const dealStages = [
  { value: "RESERVATION", label: "Reservation" },
  { value: "DEPOSIT", label: "Deposit" },
  { value: "CONTRACT", label: "Contract" },
  { value: "PAYMENT_PLAN", label: "Payment Plan" },
  { value: "TITLE_DEED", label: "Title Deed" },
  { value: "COMPLETED", label: "Completed" },
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

export function DealForm({ clients, agents }: DealFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(dealSchema),
    defaultValues: {
      currency: "USD",
      stage: "RESERVATION",
      dealValue: 0,
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      await createDeal({
        title: data.title,
        description: data.description,
        dealValue: data.dealValue,
        currency: data.currency as "USD" | "EUR" | "GBP" | "TRY" | "AED",
        stage: data.stage as "RESERVATION" | "DEPOSIT" | "CONTRACT" | "PAYMENT_PLAN" | "TITLE_DEED" | "COMPLETED" | "CANCELLED" | undefined,
        propertyType: data.propertyType as "APARTMENT" | "VILLA" | "COMMERCIAL" | "LAND" | "PENTHOUSE" | undefined,
        propertyName: data.propertyName,
        unitNumber: data.unitNumber,
        expectedCloseDate: data.expectedCloseDate || undefined,
        clientId: data.clientId,
        ownerId: data.ownerId || undefined,
      });
      toast({
        title: "Deal created",
        description: "The deal has been created successfully.",
      });
      router.push("/deals");
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
      {/* Deal Details */}
      <Card className="border border-gray-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold text-gray-900">
            Deal Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-sm font-medium text-gray-700">
              Deal Title *
            </Label>
            <Input
              id="title"
              {...register("title")}
              placeholder="e.g., Villa Purchase - Beylikduzu"
              className="bg-white"
            />
            {errors.title && (
              <p className="text-sm text-red-500">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-sm font-medium text-gray-700">
              Description
            </Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Additional details about this deal..."
              rows={3}
              className="bg-white"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">
                Client *
              </Label>
              <Select
                value={watch("clientId")}
                onValueChange={(value) => setValue("clientId", value)}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.firstName} {client.lastName} ({client.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.clientId && (
                <p className="text-sm text-red-500">{errors.clientId.message}</p>
              )}
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
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.firstName} {agent.lastName} ({agent.office})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">
                Deal Stage
              </Label>
              <Select
                value={watch("stage") || "RESERVATION"}
                onValueChange={(value) => setValue("stage", value)}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dealStages.map((stage) => (
                    <SelectItem key={stage.value} value={stage.value}>
                      {stage.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expectedCloseDate" className="text-sm font-medium text-gray-700">
                Expected Close Date
              </Label>
              <Input
                id="expectedCloseDate"
                type="date"
                {...register("expectedCloseDate")}
                className="bg-white"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Details */}
      <Card className="border border-gray-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold text-gray-900">
            Financial Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">
                Deal Value *
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
                  {...register("dealValue", { valueAsNumber: true })}
                  placeholder="0"
                  className="bg-white flex-1"
                />
              </div>
              {errors.dealValue && (
                <p className="text-sm text-red-500">{errors.dealValue.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Property Details */}
      <Card className="border border-gray-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold text-gray-900">
            Property Details
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
              <Label htmlFor="propertyName" className="text-sm font-medium text-gray-700">
                Property / Project Name
              </Label>
              <Input
                id="propertyName"
                {...register("propertyName")}
                placeholder="e.g., Beylikduzu Residence"
                className="bg-white"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="unitNumber" className="text-sm font-medium text-gray-700">
              Unit Number
            </Label>
            <Input
              id="unitNumber"
              {...register("unitNumber")}
              placeholder="e.g., A-1204"
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
          Create Deal
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
