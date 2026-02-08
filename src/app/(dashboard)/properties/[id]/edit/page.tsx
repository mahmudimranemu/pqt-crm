import { notFound } from "next/navigation";
import Link from "next/link";
import { getProperty } from "@/lib/actions/properties";
import { PropertyForm } from "../../property-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPropertyPage({ params }: PageProps) {
  const { id } = await params;
  const property = await getProperty(id);

  if (!property) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/properties/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Property</h1>
          <p className="text-muted-foreground">
            Update {property.name} ({property.pqtNumber})
          </p>
        </div>
      </div>

      <PropertyForm property={property} />
    </div>
  );
}
