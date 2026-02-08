import { getSaleFormData } from "@/lib/actions/sales";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SaleForm } from "./sale-form";

export default async function CreateSalePage() {
  const { clients, properties, agents, bookingsWithOffers } = await getSaleFormData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Record Sale</h1>
        <p className="text-muted-foreground">
          Record a new property sale
        </p>
      </div>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Sale Details</CardTitle>
        </CardHeader>
        <CardContent>
          <SaleForm
            clients={clients}
            properties={properties}
            agents={agents}
            bookingsWithOffers={bookingsWithOffers}
          />
        </CardContent>
      </Card>
    </div>
  );
}
