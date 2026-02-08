import { getAgentsForAssignment } from "@/lib/actions/clients";
import { getActiveProperties } from "@/lib/actions/enquiries";
import { ClientForm } from "../client-form";

export default async function CreateClientPage() {
  const [agents, properties] = await Promise.all([
    getAgentsForAssignment(),
    getActiveProperties(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create New Lead</h1>
        <p className="text-gray-500">
          Fill in the client information to create a new lead
        </p>
      </div>

      <ClientForm agents={agents} properties={properties} />
    </div>
  );
}
