import { PropertyForm } from "../property-form";

export default function CreatePropertyPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Add Property</h1>
        <p className="text-muted-foreground">
          Add a new property listing to the system
        </p>
      </div>

      <PropertyForm />
    </div>
  );
}
