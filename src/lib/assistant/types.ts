export type AssistantResult =
  | { kind: "text"; text: string }
  | {
      kind: "list";
      title: string;
      items: { title: string; subtitle?: string; href: string }[];
      total: number;
      viewAllHref?: string;
    }
  | { kind: "count"; label: string; value: number; href?: string }
  | { kind: "compound"; title: string; results: AssistantResult[] };

export function summarizeResultForHistory(r: AssistantResult): string {
  switch (r.kind) {
    case "text":
      return r.text.slice(0, 200);
    case "count":
      return `${r.label}: ${r.value}`;
    case "list":
      return `${r.title} (${r.items.length} of ${r.total} shown)`;
    case "compound":
      return `${r.title} — ${r.results.map(summarizeResultForHistory).join(" | ")}`;
  }
}
