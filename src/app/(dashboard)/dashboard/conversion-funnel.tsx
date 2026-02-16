"use client";

const COLORS = ["#dc2626", "#0150B5", "#2563eb", "#60a5fa"];

interface Props {
  data: { stage: string; count: number }[];
}

export function ConversionFunnel({ data }: Props) {
  if (!data.length || data.every((d) => d.count === 0)) {
    return (
      <div className="flex h-[250px] items-center justify-center text-sm text-gray-400">
        No funnel data available
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="space-y-3 py-4">
      {data.map((item, i) => {
        const pct = (item.count / max) * 100;
        const convRate =
          i > 0 && data[i - 1].count > 0
            ? ((item.count / data[i - 1].count) * 100).toFixed(1)
            : null;

        return (
          <div key={item.stage} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">{item.stage}</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900">
                  {item.count}
                </span>
                {convRate && (
                  <span className="text-xs text-gray-400">({convRate}%)</span>
                )}
              </div>
            </div>
            <div className="h-6 w-full rounded-full bg-gray-100">
              <div
                className="h-6 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.max(pct, 2)}%`,
                  backgroundColor: COLORS[i % COLORS.length],
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
