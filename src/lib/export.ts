/**
 * Generate a CSV string from an array of objects.
 */
export function generateCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: { key: string; header: string }[],
): string {
  if (data.length === 0) return "";

  // Header row
  const header = columns.map((c) => escapeCSV(c.header)).join(",");

  // Data rows
  const rows = data.map((item) =>
    columns
      .map((c) => {
        const value = getNestedValue(item, c.key);
        return escapeCSV(formatValue(value));
      })
      .join(","),
  );

  return [header, ...rows].join("\n");
}

function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce((acc: unknown, key) => {
    if (acc && typeof acc === "object") {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/**
 * Trigger a CSV file download in the browser.
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
