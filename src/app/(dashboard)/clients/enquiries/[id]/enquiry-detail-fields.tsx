"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import {
  CheckSquare,
  Square,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  updateEnquiryField,
  assignEnquiryToPool,
  removeEnquiryFromPool,
} from "@/lib/actions/enquiries";

interface Agent {
  id: string;
  firstName: string;
  lastName: string;
}

interface EnquiryFieldsData {
  id: string;
  called: boolean;
  spoken: boolean;
  segment: string | null;
  leadStatus: string | null;
  priority: string | null;
  nextCallDate: string | null;
  snooze: string | null;
  assignedAgentId: string | null;
  tags: string[];
}

interface EnquiryDetailFieldsProps {
  enquiry: EnquiryFieldsData;
  agents: Agent[];
}

const statusColors: Record<string, string> = {
  Hot: "text-red-600",
  Warm: "text-orange-500",
  Cold: "text-blue-500",
  New: "text-gray-500",
};

const priorityColors: Record<string, string> = {
  High: "text-red-600 bg-red-50",
  Medium: "text-orange-600 bg-orange-50",
  Low: "text-green-600 bg-green-50",
};

function getNextMonday(): Date {
  const today = new Date();
  const day = today.getDay();
  const daysUntilMonday = day === 0 ? 1 : 8 - day;
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + daysUntilMonday);
  return nextMonday;
}

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function MiniCalendar({
  selectedDate,
  onSelect,
}: {
  selectedDate: string | null;
  onSelect: (date: Date) => void;
}) {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());

  const toLocalDateStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const todayStr = toLocalDateStr(today);
  const selectedStr = selectedDate
    ? toLocalDateStr(new Date(selectedDate))
    : "";

  const firstDay = new Date(viewYear, viewMonth, 1);
  // Monday=0 based day index
  const startDay = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const canGoPrev =
    viewYear > today.getFullYear() ||
    (viewYear === today.getFullYear() && viewMonth > today.getMonth());

  const prevMonth = () => {
    if (!canGoPrev) return;
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  // Build calendar grid
  const cells: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  // Next month overflow days
  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

  return (
    <div className="w-full">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">
          {MONTH_NAMES[viewMonth]}
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            disabled={!canGoPrev}
            className={`p-1 rounded transition-colors ${canGoPrev ? "hover:bg-gray-100" : "opacity-30 cursor-not-allowed"}`}
          >
            <ChevronLeft className="h-4 w-4 text-gray-500" />
          </button>
          <button
            onClick={nextMonth}
            className="p-1 rounded hover:bg-gray-100 transition-colors"
          >
            <ChevronRight className="h-4 w-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map((day, i) => (
          <div
            key={i}
            className="text-center text-xs font-medium text-gray-400 py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          if (day === null) {
            // Overflow day from prev/next month
            const isBeforeStart = i < startDay;
            const overflowDay = isBeforeStart
              ? prevMonthDays - startDay + i + 1
              : i - startDay - daysInMonth + 1;
            return (
              <div
                key={i}
                className="text-center text-xs text-gray-300 py-1.5"
              >
                {overflowDay}
              </div>
            );
          }

          const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedStr;
          const isPast = dateStr < todayStr;

          return (
            <button
              key={i}
              disabled={isPast}
              onClick={() => onSelect(new Date(viewYear, viewMonth, day))}
              className={`text-center text-xs py-1.5 rounded-full mx-auto w-7 h-7 flex items-center justify-center transition-colors
                ${isPast ? "text-gray-300 cursor-not-allowed" : ""}
                ${isSelected && !isPast ? "bg-[#dc2626] text-white font-semibold" : ""}
                ${isToday && !isSelected ? "bg-blue-600 text-white font-semibold" : ""}
                ${!isToday && !isSelected && !isPast ? "text-gray-700 hover:bg-gray-100" : ""}
              `}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function EnquiryDetailFields({
  enquiry,
  agents,
}: EnquiryDetailFieldsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleFieldUpdate = async (
    field: string,
    value: string | boolean | Date | null,
  ) => {
    try {
      await updateEnquiryField(enquiry.id, field, value);
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to update",
      });
    }
  };

  const selectClass =
    "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#dc2626]/20 focus:border-[#dc2626]";

  const toDateStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const currentDate = enquiry.nextCallDate
    ? toDateStr(new Date(enquiry.nextCallDate))
    : "";
  const todayStr = toDateStr(new Date());
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = toDateStr(tomorrowDate);
  const nextMondayStr = toDateStr(getNextMonday());

  const activeClass =
    "bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:text-white";

  return (
    <Card className={isPending ? "opacity-60" : ""}>
      <CardContent className="p-6">
        <div className="flex gap-8">
          {/* Left: Lead Management Fields */}
          <div className="flex-1 space-y-5">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="h-4 w-4" />
              <h3 className="text-base font-semibold">Lead Management</h3>
            </div>

            {/* Row 1: Called/Spoken + Segment + Lead Status */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button
                onClick={() => handleFieldUpdate("called", !enquiry.called)}
                className="flex items-center gap-2 rounded-lg border border-gray-200 p-3 hover:bg-gray-50 transition-colors text-left"
              >
                {enquiry.called ? (
                  <CheckSquare className="h-5 w-5 text-[#dc2626]" />
                ) : (
                  <Square className="h-5 w-5 text-gray-300" />
                )}
                <div>
                  <p className="text-xs text-gray-500">Called</p>
                  <p className="text-sm font-medium">
                    {enquiry.called ? "Yes" : "No"}
                  </p>
                </div>
              </button>

              <button
                onClick={() => handleFieldUpdate("spoken", !enquiry.spoken)}
                className="flex items-center gap-2 rounded-lg border border-gray-200 p-3 hover:bg-gray-50 transition-colors text-left"
              >
                {enquiry.spoken ? (
                  <CheckSquare className="h-5 w-5 text-[#dc2626]" />
                ) : (
                  <Square className="h-5 w-5 text-gray-300" />
                )}
                <div>
                  <p className="text-xs text-gray-500">Spoken</p>
                  <p className="text-sm font-medium">
                    {enquiry.spoken ? "Yes" : "No"}
                  </p>
                </div>
              </button>

              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide block mb-1.5">
                  Segment
                </label>
                <select
                  className={selectClass}
                  value={enquiry.segment || "Buyer"}
                  onChange={(e) =>
                    handleFieldUpdate("segment", e.target.value)
                  }
                >
                  <option value="Buyer">Buyer</option>
                  <option value="Investor">Investor</option>
                  <option value="Tenant">Tenant</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide block mb-1.5">
                  Lead Status
                </label>
                <select
                  className={`${selectClass} font-medium ${statusColors[enquiry.leadStatus || "New"] || "text-gray-600"}`}
                  value={enquiry.leadStatus || "New"}
                  onChange={(e) =>
                    handleFieldUpdate("leadStatus", e.target.value)
                  }
                >
                  <option value="Hot">Hot</option>
                  <option value="Warm">Warm</option>
                  <option value="Cold">Cold</option>
                  <option value="New">New</option>
                </select>
              </div>
            </div>

            {/* Row 2: Priority + Snooze + Assigned Consultant */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide block mb-1.5">
                  Priority
                </label>
                <select
                  className={`${selectClass} font-medium ${priorityColors[enquiry.priority || "Medium"] || "text-gray-600 bg-white"}`}
                  value={enquiry.priority || "Medium"}
                  onChange={(e) =>
                    handleFieldUpdate("priority", e.target.value)
                  }
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide block mb-1.5">
                  Snooze
                </label>
                <select
                  className={selectClass}
                  value={enquiry.snooze || "Active"}
                  onChange={(e) =>
                    handleFieldUpdate("snooze", e.target.value)
                  }
                >
                  <option value="Active">Active</option>
                  <option value="1 Day">1 Day</option>
                  <option value="3 Days">3 Days</option>
                  <option value="1 Week">1 Week</option>
                  <option value="2 Weeks">2 Weeks</option>
                  <option value="1 Month">1 Month</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide block mb-1.5">
                  Assigned Consultant
                </label>
                <select
                  className={selectClass}
                  value={
                    enquiry.tags.includes("POOL_1")
                      ? "POOL_1"
                      : enquiry.tags.includes("POOL_2")
                        ? "POOL_2"
                        : enquiry.tags.includes("POOL_3")
                          ? "POOL_3"
                          : enquiry.assignedAgentId || "unassigned"
                  }
                  onChange={async (e) => {
                    const val = e.target.value;
                    if (
                      val === "POOL_1" ||
                      val === "POOL_2" ||
                      val === "POOL_3"
                    ) {
                      await assignEnquiryToPool(enquiry.id, val);
                      startTransition(() => router.refresh());
                    } else {
                      if (
                        enquiry.tags.some((t) => t.startsWith("POOL_"))
                      ) {
                        await removeEnquiryFromPool(enquiry.id);
                      }
                      const agentVal = val === "unassigned" ? null : val;
                      await handleFieldUpdate("assignedAgentId", agentVal);
                    }
                  }}
                >
                  <option value="unassigned">Unassigned</option>
                  <option
                    value="POOL_1"
                    className="text-blue-600 font-medium"
                  >
                    Pool 1
                  </option>
                  <option
                    value="POOL_2"
                    className="text-blue-600 font-medium"
                  >
                    Pool 2
                  </option>
                  <option
                    value="POOL_3"
                    className="text-blue-600 font-medium"
                  >
                    Pool 3
                  </option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.firstName} {agent.lastName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Right: Calendar + Quick Buttons */}
          <div className="hidden lg:flex flex-col items-center w-64 shrink-0 border-l pl-8">
            <h3 className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-3 self-end">
              Next Call Date
            </h3>
            <MiniCalendar
              selectedDate={enquiry.nextCallDate}
              onSelect={(date) => handleFieldUpdate("nextCallDate", date)}
            />
            <div className="flex gap-2 mt-4 w-full">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={`flex-1 text-xs ${currentDate === todayStr ? activeClass : ""}`}
                onClick={() =>
                  handleFieldUpdate("nextCallDate", new Date())
                }
              >
                Today
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={`flex-1 text-xs ${currentDate === tomorrowStr ? activeClass : ""}`}
                onClick={() => {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  handleFieldUpdate("nextCallDate", tomorrow);
                }}
              >
                Tomorrow
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={`flex-1 text-xs ${currentDate === nextMondayStr ? activeClass : ""}`}
                onClick={() =>
                  handleFieldUpdate("nextCallDate", getNextMonday())
                }
              >
                Next Week
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile: Calendar below fields */}
        <div className="lg:hidden mt-5 pt-5 border-t">
          <h3 className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-3">
            Next Call Date
          </h3>
          <div className="max-w-xs">
            <MiniCalendar
              selectedDate={enquiry.nextCallDate}
              onSelect={(date) => handleFieldUpdate("nextCallDate", date)}
            />
          </div>
          <div className="flex gap-2 mt-4 max-w-xs">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={`flex-1 text-xs ${currentDate === todayStr ? activeClass : ""}`}
              onClick={() =>
                handleFieldUpdate("nextCallDate", new Date())
              }
            >
              Today
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={`flex-1 text-xs ${currentDate === tomorrowStr ? activeClass : ""}`}
              onClick={() => {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                handleFieldUpdate("nextCallDate", tomorrow);
              }}
            >
              Tomorrow
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={`flex-1 text-xs ${currentDate === nextMondayStr ? activeClass : ""}`}
              onClick={() =>
                handleFieldUpdate("nextCallDate", getNextMonday())
              }
            >
              Next Week
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
