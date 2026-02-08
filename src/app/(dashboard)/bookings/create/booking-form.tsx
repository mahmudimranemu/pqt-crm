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
import { createBooking } from "@/lib/actions/bookings";

const bookingSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  propertyId: z.string().min(1, "Property is required"),
  agentId: z.string().min(1, "Agent is required"),
  bookingDate: z.string().min(1, "Booking date is required"),
  bookingTime: z.string().min(1, "Booking time is required"),
  bookingType: z.enum([
    "PROPERTY_VIEWING",
    "FOLLOW_UP_MEETING",
    "DOCUMENT_SIGNING",
    "TITLE_DEED",
  ]),
  notes: z.string().optional(),
});

type BookingFormData = z.infer<typeof bookingSchema>;

interface BookingFormProps {
  clients: { id: string; firstName: string; lastName: string }[];
  properties: {
    id: string;
    name: string;
    pqtNumber: string;
    district: string;
  }[];
  agents: { id: string; firstName: string; lastName: string }[];
}

export function BookingForm({ clients, properties, agents }: BookingFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      bookingType: "PROPERTY_VIEWING",
    },
  });

  const onSubmit = async (data: BookingFormData) => {
    try {
      setIsSubmitting(true);
      setError(null);

      const bookingDateTime = new Date(
        `${data.bookingDate}T${data.bookingTime}`,
      );

      await createBooking({
        clientId: data.clientId,
        propertyId: data.propertyId,
        agentId: data.agentId,
        bookingDate: bookingDateTime,
        bookingType: data.bookingType,
        status: "SCHEDULED",
        notes: data.notes,
      });

      router.push("/bookings/calendar");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create booking");
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

      <div className="space-y-2">
        <Label htmlFor="clientId">Client *</Label>
        <Select onValueChange={(value) => setValue("clientId", value)}>
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
        <Select onValueChange={(value) => setValue("propertyId", value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select a property" />
          </SelectTrigger>
          <SelectContent>
            {properties.map((property) => (
              <SelectItem key={property.id} value={property.id}>
                {property.name} ({property.pqtNumber}) - {property.district}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.propertyId && (
          <p className="text-sm text-red-500">{errors.propertyId.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="agentId">Assigned Agent *</Label>
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

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="bookingDate">Date *</Label>
          <Input id="bookingDate" type="date" {...register("bookingDate")} />
          {errors.bookingDate && (
            <p className="text-sm text-red-500">{errors.bookingDate.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="bookingTime">Time *</Label>
          <Input id="bookingTime" type="time" {...register("bookingTime")} />
          {errors.bookingTime && (
            <p className="text-sm text-red-500">{errors.bookingTime.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bookingType">Booking Type *</Label>
        <Select
          defaultValue="PROPERTY_VIEWING"
          onValueChange={(value) =>
            setValue("bookingType", value as BookingFormData["bookingType"])
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select booking type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PROPERTY_VIEWING">Property Viewing</SelectItem>
            <SelectItem value="FOLLOW_UP_MEETING">Follow-up Meeting</SelectItem>
            <SelectItem value="DOCUMENT_SIGNING">Document Signing</SelectItem>
            <SelectItem value="TITLE_DEED">Title Deed</SelectItem>
          </SelectContent>
        </Select>
        {errors.bookingType && (
          <p className="text-sm text-red-500">{errors.bookingType.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Additional notes about this booking..."
          {...register("notes")}
          rows={3}
        />
      </div>

      <div className="flex gap-4">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-[#dc2626] hover:bg-[#dc2626]/90"
        >
          {isSubmitting ? "Creating..." : "Create Booking"}
        </Button>
      </div>
    </form>
  );
}
