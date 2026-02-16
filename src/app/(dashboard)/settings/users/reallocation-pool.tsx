"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Inbox, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPoolData } from "@/lib/actions/pool";

type PoolItem = {
  id: string;
  type: "enquiry" | "lead";
  name: string;
  email: string;
  phone: string | null;
  status: string;
  createdAt: string;
  pool: string;
};

export function ReallocationPool() {
  const [poolData, setPoolData] = useState<{
    pool1: PoolItem[];
    pool2: PoolItem[];
    pool3: PoolItem[];
  }>({ pool1: [], pool2: [], pool3: [] });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getPoolData();
      setPoolData(data);
    } catch {
      console.error("Failed to fetch pool data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const pools = [
    {
      key: "pool1" as const,
      label: "Pool 1",
      tag: "POOL_1",
      color: "bg-blue-500",
    },
    {
      key: "pool2" as const,
      label: "Pool 2",
      tag: "POOL_2",
      color: "bg-purple-500",
    },
    {
      key: "pool3" as const,
      label: "Pool 3",
      tag: "POOL_3",
      color: "bg-orange-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Reallocation Pools
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Enquiries and leads waiting to be reassigned to agents
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchData}
          disabled={loading}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Pool Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {pools.map((pool) => {
          const items = poolData[pool.key];
          const enquiries = items.filter((i) => i.type === "enquiry").length;
          const leads = items.filter((i) => i.type === "lead").length;
          return (
            <div
              key={pool.key}
              className="bg-white rounded-xl border border-gray-200 p-5"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`h-3 w-3 rounded-full ${pool.color}`} />
                <h3 className="font-semibold text-gray-900">{pool.label}</h3>
                <Badge variant="secondary" className="ml-auto">
                  {items.length} total
                </Badge>
              </div>
              <div className="flex gap-4 text-sm text-gray-500">
                <span>{enquiries} enquiries</span>
                <span>{leads} leads</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pool Detail Tables */}
      {pools.map((pool) => {
        const items = poolData[pool.key];
        if (items.length === 0) return null;
        return (
          <div
            key={pool.key}
            className="bg-white rounded-xl border border-gray-200 overflow-hidden"
          >
            <div className="px-5 py-3 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
              <div className={`h-2.5 w-2.5 rounded-full ${pool.color}`} />
              <h3 className="font-medium text-gray-900">{pool.label}</h3>
              <Badge variant="outline" className="ml-2">
                {items.length}
              </Badge>
            </div>
            <div className="divide-y divide-gray-100">
              {items.map((item) => (
                <div
                  key={`${item.type}-${item.id}`}
                  className="px-5 py-3 flex items-center gap-4 hover:bg-gray-50"
                >
                  <div className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {item.name}
                      </p>
                      <Badge
                        variant="outline"
                        className={
                          item.type === "enquiry"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        }
                      >
                        {item.type === "enquiry" ? "Enquiry" : "Lead"}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500">
                      {item.email} {item.phone ? `· ${item.phone}` : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant="secondary" className="text-xs">
                      {item.status}
                    </Badge>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Empty State */}
      {!loading &&
        poolData.pool1.length === 0 &&
        poolData.pool2.length === 0 &&
        poolData.pool3.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Inbox className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">
              No items in any reallocation pool
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Assign enquiries or leads to a pool from their assignment dropdown
            </p>
          </div>
        )}
    </div>
  );
}
