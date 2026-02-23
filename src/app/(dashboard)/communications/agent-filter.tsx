"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users } from "lucide-react";

interface Agent {
  id: string;
  firstName: string;
  lastName: string;
}

export function AgentFilter({ agents }: { agents: Agent[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentAgent = searchParams.get("agentId") || "all";

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("agentId");
    } else {
      params.set("agentId", value);
    }

    startTransition(() => {
      router.push(`/communications?${params.toString()}`);
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Users className="h-4 w-4 text-muted-foreground" />
      <Select value={currentAgent} onValueChange={handleChange}>
        <SelectTrigger className={`w-[220px] ${isPending ? "opacity-70" : ""}`}>
          <SelectValue placeholder="Filter by agent..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Agents</SelectItem>
          {agents.map((agent) => (
            <SelectItem key={agent.id} value={agent.id}>
              {agent.firstName} {agent.lastName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
