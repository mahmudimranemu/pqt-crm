"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { X } from "lucide-react";

const PRIORITIES = [
  { value: "High", label: "High", color: "text-red-600 border-red-300 bg-red-50 hover:bg-red-100" , activeColor: "bg-red-600 text-white border-red-600" },
  { value: "Medium", label: "Medium", color: "text-orange-600 border-orange-300 bg-orange-50 hover:bg-orange-100", activeColor: "bg-orange-500 text-white border-orange-500" },
  { value: "Low", label: "Low", color: "text-green-600 border-green-300 bg-green-50 hover:bg-green-100", activeColor: "bg-green-600 text-white border-green-600" },
];

export function PriorityFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activePriority = searchParams.get("priority") || "";

  function handleClick(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (activePriority === value) {
      params.delete("priority");
    } else {
      params.set("priority", value);
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  function handleReset() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("priority");
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-0">
      <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden">
        {PRIORITIES.map((p) => (
          <button
            key={p.value}
            onClick={() => handleClick(p.value)}
            className={`px-4 py-1.5 text-sm font-semibold border-r last:border-r-0 transition-colors ${
              activePriority === p.value
                ? p.activeColor
                : `${p.color} border-gray-200`
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {activePriority && (
        <button
          onClick={handleReset}
          className="ml-2 flex items-center justify-center h-7 w-7 rounded-full border border-gray-300 bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          title="Clear priority filter"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
