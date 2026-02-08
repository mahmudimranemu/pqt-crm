"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createSale } from "@/lib/actions/sales";
import type { Decimal } from "@prisma/client/runtime/library";

const saleSchema = z.object({
  bookingId: z.string().optional(),
  clientId: z.string().min(1, "Client is required"),
  propertyId: z.string().min(1, "Property is required"),
  agentId: z.string().min(1, "Agent is required"),
  unitNumber: z.string().optional(),
  salePrice: z.number().min(1, "Sale price is required"),
  currency: z.enum(["USD", "EUR", "GBP", "TRY", "AED"]),
  depositAmount: z.number().optional(),
  depositDate: z.string().optional(),
  completionDate: z.string().optional(),
  commissionAmount: z.number().optional(),
  paymentPlan: z.string().optional(),
  citizenshipEligible: z.boolean(),
  notes: z.string().optional(),
});

type SaleFormData = z.infer<typeof saleSchema>;

interface BookingWithOffer {
  id: string;
  client: { id: string; firstName: string; lastName: string };
  property: { id: string; name: string; pqtNumber: string };
}

interface SaleFormProps {
  clients: { id: string; firstName: string; lastName: string }[];
  properties: { id: string; name: string; pqtNumber: string; district: string; priceFrom: Decimal | null }[];
  agents: { id: string; firstName: string; lastName: string }[];
  bookingsWithOffers: BookingWithOffer[];
}

export function SaleForm({ clients, properties, agents, bookingsWithOffers }: SaleFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingWithOffer | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SaleFormData>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      currency: "USD",
      citizenshipEligible: false,
    },
  });

  const handleBookingSelect = (bookingId: string) => {
    const booking = bookingsWithOffers.find((b) => b.id === bookingId);
    if (booking) {
      setSelectedBooking(booking);
      setValue("bookingId", booking.id);
      setValue("clientId", booking.client.id);
      setValue("propertyId", booking.property.id);
    }
  };

  const onSubmit = async (data: SaleFormData) => {
    try {
      setIsSubmitting(true);
      setError(null);

      await createSale({
        ...data,
        depositDate: data.depositDate ? new Date(data.depositDate) : undefined,
        completionDate: data.completionDate ? new Date(data.completionDate) : undefined,
      });

      router.push("/sales");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create sale");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Quick Link from Booking */}
      {bookingsWithOffers.length > 0 && (
        <Card className="border-[#dc2626]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[#dc2626]">
              Quick: Convert from Offer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select onValueChange={handleBookingSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select a booking with offer made..." />
              </SelectTrigger>
              <SelectContent>
                {bookingsWithOffers.map((booking) => (
                  <SelectItem key={booking.id} value={booking.id}>
                    {booking.client.firstName} {booking.client.lastName} - {booking.property.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="clientId">Client *</Label>
          <Select
            value={watch("clientId")}
            onValueChange={(value) => setValue("clientId", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a client" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.firstName} {client.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.clientId && (
            <p className="text-sm text-red-500">{errors.clientId.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="propertyId">Property *</Label>
          <Select
            value={watch("propertyId")}
            onValueChange={(value) => setValue("propertyId", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a property" />
            </SelectTrigger>
            <SelectContent>
              {properties.map((property) => (
                <SelectItem key={property.id} value={property.id}>
                  {property.name} ({property.pqtNumber})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.propertyId && (
            <p className="text-sm text-red-500">{errors.propertyId.message}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="agentId">Sales Agent *</Label>
          <Select onValueChange={(value) => setValue("agentId", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select an agent" />
            </SelectTrigger>
            <SelectContent>
              {agents.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.firstName} {agent.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.agentId && (
            <p className="text-sm text-red-500">{errors.agentId.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="unitNumber">Unit Number</Label>
          <Input
            id="unitNumber"
            placeholder="e.g., A-1205"
            {...register("unitNumber")}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="salePrice">Sale Price *</Label>
          <Input
            id="salePrice"
            type="number"
            placeholder="0"
            {...register("salePrice", { valueAsNumber: true })}
          />
          {errors.salePrice && (
            <p className="text-sm text-red-500">{errors.salePrice.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="currency">Currency *</Label>
          <Select
            defaultValue="USD"
            onValueChange={(value) => setValue("currency", value as SaleFormData["currency"])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD ($)</SelectItem>
              <SelectItem value="EUR">EUR (€)</SelectItem>
              <SelectItem value="GBP">GBP (£)</SelectItem>
              <SelectItem value="TRY">TRY (₺)</SelectItem>
              <SelectItem value="AED">AED (د.إ)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="commissionAmount">Commission</Label>
          <Input
            id="commissionAmount"
            type="number"
            placeholder="0"
            {...register("commissionAmount", { valueAsNumber: true })}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="depositAmount">Deposit Amount</Label>
          <Input
            id="depositAmount"
            type="number"
            placeholder="0"
            {...register("depositAmount", { valueAsNumber: true })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="depositDate">Deposit Date</Label>
          <Input
            id="depositDate"
            type="date"
            {...register("depositDate")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="completionDate">Expected Completion</Label>
          <Input
            id="completionDate"
            type="date"
            {...register("completionDate")}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="paymentPlan">Payment Plan</Label>
        <Textarea
          id="paymentPlan"
          placeholder="e.g., 30% deposit, 40% on completion, 30% over 12 months..."
          {...register("paymentPlan")}
          rows={3}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="citizenshipEligible"
          {...register("citizenshipEligible")}
          className="h-4 w-4 rounded border-gray-300"
        />
        <Label htmlFor="citizenshipEligible" className="font-normal">
          This sale qualifies for Turkish citizenship application ($400,000+ property)
        </Label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Additional notes about this sale..."
          {...register("notes")}
          rows={3}
        />
      </div>

      <div className="flex gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-[#dc2626] hover:bg-[#dc2626]/90"
        >
          {isSubmitting ? "Recording..." : "Record Sale"}
        </Button>
      </div>
    </form>
  );
}
