"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, X, Search, ChevronDown } from "lucide-react";
import { updateLeadProperties } from "@/lib/actions/leads";

interface Property {
  id: string;
  name: string;
  pqtNumber: string;
}

interface LeadPropertySelectorProps {
  leadId: string;
  selectedRefs: string[];
  properties: Property[];
}

export function LeadPropertySelector({
  leadId,
  selectedRefs,
  properties,
}: LeadPropertySelectorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const selectedProperties = useMemo(
    () => properties.filter((p) => selectedRefs.includes(p.id)),
    [properties, selectedRefs],
  );

  const filteredProperties = useMemo(() => {
    const q = search.toLowerCase();
    return properties.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.pqtNumber.toLowerCase().includes(q),
    );
  }, [properties, search]);

  function toggleProperty(propertyId: string) {
    const newRefs = selectedRefs.includes(propertyId)
      ? selectedRefs.filter((id) => id !== propertyId)
      : [...selectedRefs, propertyId];

    startTransition(async () => {
      await updateLeadProperties(leadId, newRefs);
      router.refresh();
    });
  }

  function removeProperty(propertyId: string) {
    const newRefs = selectedRefs.filter((id) => id !== propertyId);
    startTransition(async () => {
      await updateLeadProperties(leadId, newRefs);
      router.refresh();
    });
  }

  return (
    <Card className={isPending ? "opacity-60 pointer-events-none" : ""}>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="h-4 w-4 text-[#dc2626]" />
          Interested Properties
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Selected properties */}
        {selectedProperties.length > 0 && (
          <div className="space-y-2">
            {selectedProperties.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.pqtNumber}</p>
                </div>
                <button
                  onClick={() => removeProperty(p.id)}
                  className="rounded-full p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
                  title="Remove property"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Dropdown to add */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <span>
              {selectedProperties.length === 0
                ? "Select properties..."
                : "Add more properties..."}
            </span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </button>

          {open && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => { setOpen(false); setSearch(""); }}
              />
              <div className="absolute z-20 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">
                {/* Search */}
                <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2">
                  <Search className="h-4 w-4 text-gray-400 shrink-0" />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Search properties..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="flex-1 text-sm outline-none bg-transparent"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                {/* Options list */}
                <div className="max-h-56 overflow-y-auto py-1">
                  {filteredProperties.length === 0 ? (
                    <p className="px-3 py-4 text-center text-sm text-gray-400">
                      No properties found
                    </p>
                  ) : (
                    filteredProperties.map((p) => {
                      const isSelected = selectedRefs.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleProperty(p.id);
                          }}
                          className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50 ${
                            isSelected ? "bg-red-50" : ""
                          }`}
                        >
                          <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                              isSelected
                                ? "border-[#dc2626] bg-[#dc2626] text-white"
                                : "border-gray-300"
                            }`}
                          >
                            {isSelected && (
                              <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                                <path
                                  d="M2 6l3 3 5-5"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-900 truncate">{p.name}</p>
                            <p className="text-xs text-gray-500">{p.pqtNumber}</p>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {selectedProperties.length === 0 && (
          <p className="text-xs text-gray-400">No properties assigned yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
