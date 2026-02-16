import { getClientsForSelect, getAgentsForAssignment } from "@/lib/actions/clients";
import { LeadForm } from "../lead-form";

export default async function CreateLeadPage() {
  const [clients, agents] = await Promise.all([
    getClientsForSelect(),
    getAgentsForAssignment(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create New Lead</h1>
        <p className="text-gray-500">
          Enter lead details to add to the pipeline
        </p>
      </div>

      <LeadForm clients={clients} agents={agents} />
    </div>
  );
}
