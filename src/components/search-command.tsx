"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Target,
  Handshake,
  Building2,
  Mail,
  Search,
  Loader2,
  X,
} from "lucide-react";
import { globalSearch, type SearchResult } from "@/lib/actions/search";

const categoryConfig: Record<
  SearchResult["category"],
  { icon: React.ElementType; label: string; color: string }
> = {
  client: { icon: Users, label: "Clients", color: "text-blue-600" },
  lead: { icon: Target, label: "Leads", color: "text-emerald-600" },
  deal: { icon: Handshake, label: "Deals", color: "text-purple-600" },
  property: { icon: Building2, label: "Properties", color: "text-amber-600" },
  enquiry: { icon: Mail, label: "Enquiries", color: "text-cyan-600" },
};

export function SearchCommand() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Open on Cmd/Ctrl+K
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
    }
  }, [open]);

  // Debounced search
  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const data = await globalSearch(q);
      setResults(data);
      setSelectedIndex(0);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search]);

  const navigate = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      navigate(results[selectedIndex].href);
    }
  };

  // Group results by category
  const grouped = results.reduce(
    (acc, r) => {
      if (!acc[r.category]) acc[r.category] = [];
      acc[r.category].push(r);
      return acc;
    },
    {} as Record<string, SearchResult[]>,
  );

  if (!open) return null;

  let flatIndex = -1;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-lg rounded-xl border bg-white shadow-2xl">
        {/* Search input */}
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <Search className="h-5 w-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search clients, leads, deals, properties..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
          />
          {loading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
          <button
            onClick={() => setOpen(false)}
            className="rounded-md border px-1.5 py-0.5 text-xs text-gray-400 hover:text-gray-600"
          >
            ESC
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2">
          {query.length >= 2 && !loading && results.length === 0 && (
            <div className="py-8 text-center text-sm text-gray-500">
              No results found for &ldquo;{query}&rdquo;
            </div>
          )}

          {query.length < 2 && (
            <div className="py-8 text-center text-sm text-gray-400">
              Type at least 2 characters to search...
            </div>
          )}

          {Object.entries(grouped).map(([category, items]) => {
            const config = categoryConfig[category as SearchResult["category"]];
            const Icon = config.icon;

            return (
              <div key={category} className="mb-2">
                <div className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {config.label}
                </div>
                {items.map((item) => {
                  flatIndex++;
                  const idx = flatIndex;
                  return (
                    <button
                      key={item.id}
                      onClick={() => navigate(item.href)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        idx === selectedIndex
                          ? "bg-[#dc2626]/10 text-[#dc2626]"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${config.color}`} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{item.title}</div>
                        <div className="truncate text-xs text-gray-500">
                          {item.subtitle}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-gray-400">
          <span>
            <kbd className="rounded border bg-gray-100 px-1 py-0.5 font-mono">
              ↑↓
            </kbd>{" "}
            Navigate{" "}
            <kbd className="rounded border bg-gray-100 px-1 py-0.5 font-mono">
              ↵
            </kbd>{" "}
            Open
          </span>
          <span>
            <kbd className="rounded border bg-gray-100 px-1 py-0.5 font-mono">
              ⌘K
            </kbd>{" "}
            Toggle
          </span>
        </div>
      </div>
    </div>
  );
}
