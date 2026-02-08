"use client";

const pipelineStages = [
  { name: "New Enquiries", count: 45, value: "$12.5M", color: "bg-teal-400", width: "100%" },
  { name: "Qualified", count: 32, value: "$9.8M", color: "bg-emerald-500", width: "71%" },
  { name: "Property Viewed", count: 24, value: "$7.2M", color: "bg-[#dc2626]", width: "53%" },
  { name: "Negotiation", count: 12, value: "$4.1M", color: "bg-teal-500", width: "27%" },
  { name: "Closed Won", count: 8, value: "$2.8M", color: "bg-emerald-500", width: "18%" },
];

export function SalesPipeline() {
  return (
    <div className="space-y-5">
      {pipelineStages.map((stage) => (
        <div key={stage.name} className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`h-2.5 w-2.5 rounded-full ${stage.color}`} />
              <span className="text-sm font-medium text-gray-700">
                {stage.name}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="font-medium text-gray-900">{stage.count}</span>
              <span className="text-gray-500">{stage.value}</span>
            </div>
          </div>
          <div className="h-2.5 w-full rounded-full bg-gray-100">
            <div
              className={`h-2.5 rounded-full ${stage.color} transition-all`}
              style={{ width: stage.width }}
            />
          </div>
        </div>
      ))}

      {/* Totals */}
      <div className="mt-6 flex items-center justify-between rounded-lg bg-gray-50 p-4">
        <div>
          <p className="text-xs text-gray-500">Total Pipeline Value</p>
          <p className="text-xl font-bold text-gray-900">$36.4M</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Avg. Deal Size</p>
          <p className="text-xl font-bold text-gray-900">$892K</p>
        </div>
      </div>
    </div>
  );
}
