"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  updateLeadField,
  updateLeadStage,
  assignLeadToPool,
  removeLeadFromPool,
} from "@/lib/actions/leads";
import { Settings, ChevronLeft, ChevronRight } from "lucide-react";

interface LeadDetailFieldsProps {
  lead: {
    id: string;
    stage: string;
    segment: string | null;
    priority: string | null;
    nextCallDate: string | null;
    snooze: string | null;
    ownerId: string;
    temperature: string | null;
    tags: string[];
  };
  agents: { id: string; firstName: string; lastName: string }[];
}

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

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

  return (
    <div className="w-full">
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

      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          if (day === null) {
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

export function LeadDetailFields({ lead, agents }: LeadDetailFieldsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleChange(field: string, value: string | boolean | null) {
    startTransition(async () => {
      await updateLeadField(lead.id, field, value);
      router.refresh();
    });
  }

  function handleStageChange(stage: string) {
    startTransition(async () => {
      await updateLeadStage(lead.id, stage as any);
      router.refresh();
    });
  }

  const selectClass =
    "mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#dc2626]/20 focus:border-[#dc2626]";

  const toDateStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const currentDate = lead.nextCallDate
    ? toDateStr(new Date(lead.nextCallDate))
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

            {/* Row 1: Stage + Segment + Priority + Temperature */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide">
                  Stage
                </label>
                <select
                  value={lead.stage}
                  onChange={(e) => handleStageChange(e.target.value)}
                  className={selectClass}
                >
                  <option value="NEW_ENQUIRY">New Enquiry</option>
                  <option value="CONTACTED">Contacted</option>
                  <option value="QUALIFIED">Qualified</option>
                  <option value="VIEWING_ARRANGED">Viewing Arranged</option>
                  <option value="VIEWED">Viewed</option>
                  <option value="OFFER_MADE">Offer Made</option>
                  <option value="NEGOTIATING">Negotiating</option>
                  <option value="WON">Won</option>
                  <option value="LOST">Lost</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide">
                  Segment
                </label>
                <select
                  value={lead.segment || "Buyer"}
                  onChange={(e) => handleChange("segment", e.target.value)}
                  className={selectClass}
                >
                  <option value="Buyer">Buyer</option>
                  <option value="Investor">Investor</option>
                  <option value="Renter">Renter</option>
                  <option value="Citizenship">Citizenship</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide">
                  Priority
                </label>
                <select
                  value={lead.priority || "Medium"}
                  onChange={(e) => handleChange("priority", e.target.value)}
                  className={selectClass}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide">
                  Temperature
                </label>
                <select
                  value={lead.temperature || ""}
                  onChange={(e) =>
                    handleChange("temperature", e.target.value || null)
                  }
                  className={selectClass}
                >
                  <option value="">Not set</option>
                  <option value="Cold">Cold</option>
                  <option value="Warm">Warm</option>
                  <option value="Hot">Hot</option>
                </select>
              </div>
            </div>

            {/* Row 2: Snooze + Assigned Agent */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide">
                  Snooze
                </label>
                <select
                  value={lead.snooze || "Active"}
                  onChange={(e) => handleChange("snooze", e.target.value)}
                  className={selectClass}
                >
                  <option value="Active">Active</option>
                  <option value="1 Week">Snooze 1 Week</option>
                  <option value="2 Weeks">Snooze 2 Weeks</option>
                  <option value="1 Month">Snooze 1 Month</option>
                  <option value="3 Months">Snooze 3 Months</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide">
                  Assigned Agent
                </label>
                <select
                  value={
                    lead.tags.includes("POOL_1")
                      ? "POOL_1"
                      : lead.tags.includes("POOL_2")
                        ? "POOL_2"
                        : lead.tags.includes("POOL_3")
                          ? "POOL_3"
                          : lead.ownerId
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (
                      val === "POOL_1" ||
                      val === "POOL_2" ||
                      val === "POOL_3"
                    ) {
                      startTransition(async () => {
                        await assignLeadToPool(lead.id, val);
                        router.refresh();
                      });
                    } else {
                      if (lead.tags.some((t) => t.startsWith("POOL_"))) {
                        startTransition(async () => {
                          await removeLeadFromPool(lead.id);
                          await updateLeadField(lead.id, "ownerId", val);
                          router.refresh();
                        });
                      } else {
                        handleChange("ownerId", val);
                      }
                    }
                  }}
                  className={selectClass}
                >
                  <option value="POOL_1">Pool 1</option>
                  <option value="POOL_2">Pool 2</option>
                  <option value="POOL_3">Pool 3</option>
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
              selectedDate={lead.nextCallDate}
              onSelect={(date) =>
                handleChange(
                  "nextCallDate",
                  toDateStr(date),
                )
              }
            />
            <div className="flex gap-2 mt-4 w-full">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={`flex-1 text-xs ${currentDate === todayStr ? activeClass : ""}`}
                onClick={() =>
                  handleChange(
                    "nextCallDate",
                    toDateStr(new Date()),
                  )
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
                  handleChange(
                    "nextCallDate",
                    toDateStr(tomorrow),
                  );
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
                  handleChange(
                    "nextCallDate",
                    toDateStr(getNextMonday()),
                  )
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
              selectedDate={lead.nextCallDate}
              onSelect={(date) =>
                handleChange(
                  "nextCallDate",
                  toDateStr(date),
                )
              }
            />
          </div>
          <div className="flex gap-2 mt-4 max-w-xs">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={`flex-1 text-xs ${currentDate === todayStr ? activeClass : ""}`}
              onClick={() =>
                handleChange(
                  "nextCallDate",
                  toDateStr(new Date()),
                )
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
                handleChange(
                  "nextCallDate",
                  toDateStr(tomorrow),
                );
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
                handleChange(
                  "nextCallDate",
                  toDateStr(getNextMonday()),
                )
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
