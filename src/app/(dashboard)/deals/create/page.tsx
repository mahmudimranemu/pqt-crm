import { getClientsForSelect, getAgentsForAssignment } from "@/lib/actions/clients";
import { DealForm } from "../deal-form";

export default async function CreateDealPage() {
  const [clients, agents] = await Promise.all([
    getClientsForSelect(),
    getAgentsForAssignment(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create New Deal</h1>
        <p className="text-gray-500">
          Enter deal details to add to the pipeline
        </p>
      </div>

      <DealForm clients={clients} agents={agents} />
    </div>
  );
}
