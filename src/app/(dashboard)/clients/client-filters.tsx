"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X } from "lucide-react";
import type { ClientStatus, LeadSource } from "@prisma/client";

interface Agent {
  id: string;
  firstName: string;
  lastName: string;
  office: string;
}

interface ClientFiltersProps {
  agents: Agent[];
}

const statusOptions: { value: ClientStatus; label: string }[] = [
  { value: "NEW_LEAD", label: "New Lead" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "QUALIFIED", label: "Qualified" },
  { value: "VIEWING_SCHEDULED", label: "Viewing Scheduled" },
  { value: "VIEWED", label: "Viewed" },
  { value: "NEGOTIATING", label: "Negotiating" },
  { value: "DEAL_CLOSED", label: "Deal Closed" },
  { value: "LOST", label: "Lost" },
  { value: "INACTIVE", label: "Inactive" },
];

const sourceOptions: { value: LeadSource; label: string }[] = [
  { value: "WEBSITE", label: "Website" },
  { value: "REFERRAL", label: "Referral" },
  { value: "SOCIAL_MEDIA", label: "Social Media" },
  { value: "GOOGLE_ADS", label: "Google Ads" },
  { value: "FACEBOOK_ADS", label: "Facebook Ads" },
  { value: "WALK_IN", label: "Walk-in" },
  { value: "PARTNER", label: "Partner" },
  { value: "OTHER", label: "Other" },
];

export function ClientFilters({ agents }: ClientFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(searchParams.get("search") || "");

  const updateFilters = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page"); // Reset to page 1 when filtering

    startTransition(() => {
      router.push(`/clients?${params.toString()}`);
    });
  };

  const handleSearch = () => {
    updateFilters("search", search || null);
  };

  const clearFilters = () => {
    setSearch("");
    startTransition(() => {
      router.push("/clients");
    });
  };

  const hasFilters =
    searchParams.get("search") ||
    searchParams.get("status") ||
    searchParams.get("agent") ||
    searchParams.get("source");

  return (
    <div className="flex flex-wrap gap-4 items-end">
      {/* Search */}
      <div className="flex-1 min-w-[200px] max-w-sm">
        <label className="text-sm font-medium mb-1.5 block">Search</label>
        <div className="flex gap-2">
          <Input
            placeholder="Name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button variant="outline" size="icon" onClick={handleSearch}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Status Filter */}
      <div className="w-[180px]">
        <label className="text-sm font-medium mb-1.5 block">Status</label>
        <Select
          value={searchParams.get("status") || "all"}
          onValueChange={(value) =>
            updateFilters("status", value === "all" ? null : value)
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Agent Filter */}
      <div className="w-[180px]">
        <label className="text-sm font-medium mb-1.5 block">Agent</label>
        <Select
          value={searchParams.get("agent") || "all"}
          onValueChange={(value) =>
            updateFilters("agent", value === "all" ? null : value)
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="All agents" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All agents</SelectItem>
            {agents.map((agent) => (
              <SelectItem key={agent.id} value={agent.id}>
                {agent.firstName} {agent.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Source Filter */}
      <div className="w-[180px]">
        <label className="text-sm font-medium mb-1.5 block">Source</label>
        <Select
          value={searchParams.get("source") || "all"}
          onValueChange={(value) =>
            updateFilters("source", value === "all" ? null : value)
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="All sources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            {sourceOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Clear Filters */}
      {hasFilters && (
        <Button variant="ghost" onClick={clearFilters} className="gap-2">
          <X className="h-4 w-4" />
          Clear
        </Button>
      )}
    </div>
  );
}
