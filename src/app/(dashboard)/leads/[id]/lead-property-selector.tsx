"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { updateLeadField } from "@/lib/actions/leads";
import { Building2, X } from "lucide-react";

interface LeadPropertySelectorProps {
  leadId: string;
  currentProperty: { id: string; name: string; pqtNumber: string } | null;
  properties: { id: string; name: string; pqtNumber: string }[];
}

export function LeadPropertySelector({
  leadId,
  currentProperty,
  properties,
}: LeadPropertySelectorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSelect(propertyId: string) {
    startTransition(async () => {
      await updateLeadField(leadId, "interestedPropertyId", propertyId || null);
      router.refresh();
    });
  }

  function handleRemove() {
    startTransition(async () => {
      await updateLeadField(leadId, "interestedPropertyId", null);
      router.refresh();
    });
  }

  return (
    <Card className={isPending ? "opacity-60" : ""}>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="h-4 w-4" />
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
              <p className="text-xs text-gray-500">
                {currentProperty.pqtNumber}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-gray-400 hover:text-red-600"
              onClick={handleRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <select
            value=""
            onChange={(e) => handleSelect(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
          >
            <option value="">Select a property...</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.pqtNumber})
              </option>
            ))}
          </select>
        )}
      </CardContent>
    </Card>
  );
}
