import { notFound } from "next/navigation";
import Link from "next/link";
import { getClient, getAgentsForAssignment } from "@/lib/actions/clients";
import { getActiveProperties } from "@/lib/actions/enquiries";
import { ClientForm } from "../../client-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditClientPage({ params }: PageProps) {
  const { id } = await params;
  const [client, agents, properties] = await Promise.all([
    getClient(id),
    getAgentsForAssignment(),
    getActiveProperties(),
  ]);

  if (!client) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/clients/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Client</h1>
          <p className="text-muted-foreground">
            Update information for {client.firstName} {client.lastName}
          </p>
        </div>
      </div>

      <ClientForm agents={agents} properties={properties} client={client} />
    </div>
  );
}
