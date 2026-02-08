"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { Building2, X } from "lucide-react";
import { updateEnquiryField } from "@/lib/actions/enquiries";

interface Property {
  id: string;
  name: string;
  pqtNumber: string;
}

interface EnquiryPropertySelectorProps {
  enquiryId: string;
  currentProperty: Property | null;
  properties: Property[];
}

export function EnquiryPropertySelector({
  enquiryId,
  currentProperty,
  properties,
}: EnquiryPropertySelectorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handlePropertyChange = async (propertyId: string) => {
    const value = propertyId === "none" ? null : propertyId;
    try {
      await updateEnquiryField(enquiryId, "interestedPropertyId", value);
      toast({
        title: value ? "Property assigned" : "Property removed",
        description: value
          ? "The property has been linked to this enquiry."
          : "The property has been removed from this enquiry.",
      });
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to update property",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="h-4 w-4 text-[#dc2626]" />
          Interested Property
        </CardTitle>
      </CardHeader>
      <CardContent>
        {currentProperty ? (
          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div>
              <p className="text-sm font-medium text-gray-900">
                {currentProperty.name}
              </p>
              <p className="text-xs text-gray-500">{currentProperty.pqtNumber}</p>
            </div>
            <button
              onClick={() => handlePropertyChange("none")}
              className="rounded-full p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
              title="Remove property"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-gray-500">
              No property assigned. Select one below:
            </p>
            <Select onValueChange={handlePropertyChange}>
              <SelectTrigger className="bg-white">
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}
