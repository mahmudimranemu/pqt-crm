import { getEligibleSalesForCitizenship } from "@/lib/actions/citizenship";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CitizenshipForm } from "./citizenship-form";

export default async function CreateCitizenshipPage() {
  const eligibleSales = await getEligibleSalesForCitizenship();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">New Citizenship Application</h1>
        <p className="text-muted-foreground">
          Start a Turkish citizenship by investment application
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Application Details</CardTitle>
        </CardHeader>
        <CardContent>
          {eligibleSales.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No eligible sales found. A sale must be marked as citizenship-eligible
                ($400,000+ property) to start an application.
              </p>
            </div>
          ) : (
            <CitizenshipForm eligibleSales={eligibleSales} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
