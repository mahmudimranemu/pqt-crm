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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createCitizenshipApplication } from "@/lib/actions/citizenship";
import type { Decimal } from "@prisma/client/runtime/library";

interface EligibleSale {
  id: string;
  salePrice: Decimal;
  client: { id: string; firstName: string; lastName: string };
  property: { id: string; name: string };
}

interface CitizenshipFormProps {
  eligibleSales: EligibleSale[];
}

export function CitizenshipForm({ eligibleSales }: CitizenshipFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSale, setSelectedSale] = useState<EligibleSale | null>(null);
  const [formData, setFormData] = useState({
    applicationNumber: "",
    estimatedCompletionDate: "",
    notes: "",
  });

  const handleSaleSelect = (saleId: string) => {
    const sale = eligibleSales.find((s) => s.id === saleId);
    setSelectedSale(sale || null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSale) {
      setError("Please select a sale");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await createCitizenshipApplication({
        saleId: selectedSale.id,
        clientId: selectedSale.client.id,
        applicationNumber: formData.applicationNumber || undefined,
        estimatedCompletionDate: formData.estimatedCompletionDate
          ? new Date(formData.estimatedCompletionDate)
          : undefined,
        notes: formData.notes || undefined,
      });

      router.push("/citizenship");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create application");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="saleId">Select Sale *</Label>
        <Select onValueChange={handleSaleSelect}>
          <SelectTrigger>
            <SelectValue placeholder="Choose an eligible sale..." />
          </SelectTrigger>
          <SelectContent>
            {eligibleSales.map((sale) => (
              <SelectItem key={sale.id} value={sale.id}>
                {sale.client.firstName} {sale.client.lastName} - {sale.property.name} ({formatCurrency(Number(sale.salePrice))})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Only sales marked as citizenship-eligible appear here
        </p>
      </div>

      {selectedSale && (
        <div className="p-4 bg-muted rounded-lg">
          <h3 className="font-medium mb-2">Selected Sale Details</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Client:</span>{" "}
              {selectedSale.client.firstName} {selectedSale.client.lastName}
            </div>
            <div>
              <span className="text-muted-foreground">Property:</span>{" "}
              {selectedSale.property.name}
            </div>
            <div>
              <span className="text-muted-foreground">Investment:</span>{" "}
              <span className="text-[#dc2626] font-medium">
                {formatCurrency(Number(selectedSale.salePrice))}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="applicationNumber">Application Number (Optional)</Label>
        <Input
          id="applicationNumber"
          placeholder="e.g., CBI-2024-001"
          value={formData.applicationNumber}
          onChange={(e) => setFormData({ ...formData, applicationNumber: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          Government-issued application reference number (can be added later)
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="estimatedCompletionDate">Estimated Completion Date</Label>
        <Input
          id="estimatedCompletionDate"
          type="date"
          value={formData.estimatedCompletionDate}
          onChange={(e) => setFormData({ ...formData, estimatedCompletionDate: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          Typical processing time is 3-6 months
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Any special circumstances or notes about this application..."
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
          disabled={isSubmitting || !selectedSale}
          className="bg-[#dc2626] hover:bg-[#dc2626]/90"
        >
          {isSubmitting ? "Creating..." : "Start Application"}
        </Button>
      </div>
    </form>
  );
}
