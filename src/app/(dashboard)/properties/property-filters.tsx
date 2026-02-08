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
import { Search, X, Flag, LayoutGrid } from "lucide-react";

const districtOptions = [
  { value: "Büyükçekmece", label: "Büyükçekmece" },
  { value: "Beylikdüzü", label: "Beylikdüzü" },
  { value: "Kadikoy", label: "Kadikoy" },
  { value: "Kağıthane", label: "Kağıthane" },
  { value: "Taksim", label: "Taksim" },
];

const propertyTypeOptions = [
  { value: "Apartment", label: "Apartment" },
  { value: "Villa", label: "Villa" },
  { value: "Penthouse", label: "Penthouse" },
  { value: "Commercial", label: "Commercial" },
];

export function PropertyFilters() {
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
    // Reset to first page when filters change
    params.delete("page");

    startTransition(() => {
      router.push(`/properties?${params.toString()}`);
    });
  };

  const handleSearch = () => {
    updateFilters("search", search || null);
  };

  const toggleCitizenship = () => {
    const current = searchParams.get("citizenship");
    updateFilters("citizenship", current === "true" ? null : "true");
  };

  const clearFilters = () => {
    setSearch("");
    startTransition(() => {
      router.push("/properties");
    });
  };

  const hasFilters =
    searchParams.get("search") ||
    searchParams.get("district") ||
    searchParams.get("type") ||
    searchParams.get("citizenship");

  return (
    <div className="flex flex-wrap gap-4 items-end">
      {/* Search */}
      <div className="flex-1 min-w-[200px] max-w-sm">
        <label className="text-sm font-medium mb-1.5 block">Search</label>
        <div className="flex gap-2">
          <Input
            placeholder="Name, reference, or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button variant="outline" size="icon" onClick={handleSearch}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* District Filter */}
      <div className="w-[180px]">
        <label className="text-sm font-medium mb-1.5 block">District</label>
        <Select
          value={searchParams.get("district") || "all"}
          onValueChange={(value) =>
            updateFilters("district", value === "all" ? null : value)
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="All districts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All districts</SelectItem>
            {districtOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Property Type Filter */}
      <div className="w-[160px]">
        <label className="text-sm font-medium mb-1.5 block">Type</label>
        <Select
          value={searchParams.get("type") || "all"}
          onValueChange={(value) =>
            updateFilters("type", value === "all" ? null : value)
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {propertyTypeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Per Page */}
      <div className="w-[140px]">
        <label className="text-sm font-medium mb-1.5 block">Show</label>
        <Select
          value={searchParams.get("perPage") || "9"}
          onValueChange={(value) => {
            const params = new URLSearchParams(searchParams.toString());
            if (value === "9") {
              params.delete("perPage");
            } else {
              params.set("perPage", value);
            }
            params.delete("page");
            startTransition(() => {
              router.push(`/properties?${params.toString()}`);
            });
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="9">9 per page</SelectItem>
            <SelectItem value="18">18 per page</SelectItem>
            <SelectItem value="36">36 per page</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Citizenship Toggle */}
      <Button
        variant={
          searchParams.get("citizenship") === "true" ? "default" : "outline"
        }
        onClick={toggleCitizenship}
        className="gap-2"
      >
        <Flag className="h-4 w-4" />
        Citizenship Eligible
      </Button>

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
