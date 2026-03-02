"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useRef } from "react";
import { ChevronDown, X } from "lucide-react";

export interface SelectFilter {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

export interface FilterBarProps {
  selects: SelectFilter[];
  textInputs: { key: string; placeholder: string; type?: string }[];
  /** Params that should be carried through (not overridden by filter bar) */
  preserveParams?: string[];
}

export function FilterBar({ selects, textInputs, preserveParams = [] }: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLFormElement>(null);

  const buildUrl = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams();
      // Preserve specified params
      for (const key of preserveParams) {
        const val = searchParams.get(key);
        if (val) params.set(key, val);
      }
      // Apply current filter bar values from form
      if (formRef.current) {
        const data = new FormData(formRef.current);
        for (const key of [...selects.map((s) => s.key), ...textInputs.map((i) => i.key)]) {
          const val = data.get(key) as string | null;
          if (val && val !== "") params.set(key, val);
        }
      }
      // Apply updates (overrides)
      for (const [key, val] of Object.entries(updates)) {
        if (val && val !== "") {
          params.set(key, val);
        } else {
          params.delete(key);
        }
      }
      // Reset page on filter change
      params.delete("page");
      return `${pathname}?${params.toString()}`;
    },
    [searchParams, pathname, selects, textInputs, preserveParams]
  );

  const handleSelectChange = useCallback(
    (key: string, value: string) => {
      router.push(buildUrl({ [key]: value || undefined }));
    },
    [router, buildUrl]
  );

  const handleTextSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const data = new FormData(e.currentTarget);
      const updates: Record<string, string | undefined> = {};
      for (const input of textInputs) {
        const val = data.get(input.key) as string | null;
        updates[input.key] = val || undefined;
      }
      router.push(buildUrl(updates));
    },
    [router, buildUrl, textInputs]
  );

  const clearAll = useCallback(() => {
    const params = new URLSearchParams();
    for (const key of preserveParams) {
      const val = searchParams.get(key);
      if (val) params.set(key, val);
    }
    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`);
  }, [router, pathname, searchParams, preserveParams]);

  const hasActiveFilters = [...selects.map((s) => s.key), ...textInputs.map((i) => i.key)].some(
    (key) => searchParams.get(key)
  );

  return (
    <form
      ref={formRef}
      onSubmit={handleTextSubmit}
      className="flex items-center gap-1.5 overflow-x-auto pb-1"
    >
      {/* Dropdown filters */}
      {selects.map((select) => {
        const currentVal = searchParams.get(select.key) || "";
        return (
          <div key={select.key} className="relative flex-shrink-0">
            <select
              name={select.key}
              value={currentVal}
              onChange={(e) => handleSelectChange(select.key, e.target.value)}
              className={`h-8 appearance-none rounded border px-2.5 pr-7 text-xs font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-[#dc2626] ${
                currentVal
                  ? "border-[#dc2626] bg-[#dc2626] text-white"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
              }`}
              style={{ maxWidth: "110px" }}
            >
              <option value="">{select.label}</option>
              {select.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown
              className={`pointer-events-none absolute right-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 ${
                currentVal ? "text-white/80" : "text-gray-400"
              }`}
            />
          </div>
        );
      })}

      {/* Divider */}
      {selects.length > 0 && textInputs.length > 0 && (
        <div className="h-6 w-px flex-shrink-0 bg-gray-200" />
      )}

      {/* Text inputs */}
      {textInputs.map((input) => {
        const currentVal = searchParams.get(input.key) || "";
        return (
          <input
            key={input.key}
            type={input.type || "text"}
            name={input.key}
            defaultValue={currentVal}
            placeholder={input.placeholder}
            className={`h-8 flex-shrink-0 rounded border px-2.5 text-xs transition-colors focus:border-[#dc2626] focus:outline-none focus:ring-1 focus:ring-[#dc2626] ${
              currentVal ? "border-[#dc2626] bg-red-50" : "border-gray-200 bg-white text-gray-600"
            }`}
            style={{ width: "105px" }}
          />
        );
      })}

      {/* Submit button (hidden, triggered by Enter) */}
      <button type="submit" className="sr-only">
        Apply
      </button>

      {/* Clear all */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={clearAll}
          className="flex h-8 flex-shrink-0 items-center gap-1 rounded border border-gray-200 bg-white px-2 text-xs text-gray-500 hover:border-gray-300 hover:text-gray-700"
        >
          <X className="h-3 w-3" />
          Clear
        </button>
      )}
    </form>
  );
}
