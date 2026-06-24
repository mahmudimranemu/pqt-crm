"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg, DateSelectArg } from "@fullcalendar/core";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { AddEntryDialog } from "./add-entry-dialog";
import {
  type CalendarEvent,
  updateCalendarNote,
  deleteCalendarNote,
} from "@/lib/actions/calendar";

type Option = { id: string; label: string };

const LEGEND: { label: string; color: string }[] = [
  { label: "My notes", color: "#16a34a" },
  { label: "Tasks", color: "#dc2626" },
  { label: "Lead notes", color: "#2563eb" },
  { label: "Enquiry notes", color: "#7c3aed" },
  { label: "Lead follow-up", color: "#f59e0b" },
  { label: "Enquiry follow-up", color: "#0891b2" },
];

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function CalendarView({
  leads,
  enquiries,
}: {
  leads: Option[];
  enquiries: Option[];
}) {
  const router = useRouter();
  const calendarRef = useRef<FullCalendar | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [addDate, setAddDate] = useState(todayStr());

  // Personal-note edit dialog
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editDate, setEditDate] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchEvents = useCallback(async (start: Date, end: Date) => {
    try {
      const res = await fetch(
        `/api/calendar?start=${start.toISOString()}&end=${end.toISOString()}`,
      );
      if (res.ok) setEvents(await res.json());
    } catch (err) {
      console.error("Failed to load calendar events:", err);
    }
  }, []);

  const reload = useCallback(() => {
    // Re-fetch the currently visible range.
    const api = calendarRef.current?.getApi();
    if (api) fetchEvents(api.view.activeStart, api.view.activeEnd);
  }, [fetchEvents]);

  function handleEventClick(arg: EventClickArg) {
    const ev = events.find((e) => e.id === arg.event.id);
    if (!ev) return;
    if (ev.type === "note") {
      setEditEvent(ev);
      setEditTitle(ev.title);
      setEditDesc(ev.description ?? "");
      setEditDate(ev.start);
      return;
    }
    if (ev.href) router.push(ev.href);
  }

  function handleSelect(arg: DateSelectArg) {
    // arg.startStr is YYYY-MM-DD for all-day month/day clicks.
    setAddDate(arg.startStr.slice(0, 10));
    setAddOpen(true);
  }

  async function saveEdit() {
    if (!editEvent) return;
    if (!editTitle.trim()) {
      toast({ variant: "destructive", title: "Title required" });
      return;
    }
    setSaving(true);
    try {
      await updateCalendarNote(editEvent.recordId, {
        title: editTitle,
        description: editDesc,
        date: editDate,
      });
      toast({ title: "Note updated" });
      setEditEvent(null);
      reload();
      router.refresh();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update",
      });
    } finally {
      setSaving(false);
    }
  }

  async function removeNote() {
    if (!editEvent) return;
    setSaving(true);
    try {
      await deleteCalendarNote(editEvent.recordId);
      toast({ title: "Note deleted" });
      setEditEvent(null);
      reload();
      router.refresh();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {LEGEND.map((l) => (
            <div key={l.label} className="flex items-center gap-1.5 text-xs text-gray-600">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: l.color }}
              />
              {l.label}
            </div>
          ))}
        </div>
        <Button
          onClick={() => {
            setAddDate(todayStr());
            setAddOpen(true);
          }}
          className="bg-[#dc2626] hover:bg-[#b91c1c] text-white"
        >
          <Plus className="mr-1.5 h-4 w-4" /> New
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay",
            }}
            selectable
            select={handleSelect}
            events={events.map((e) => ({
              id: e.id,
              title: e.title,
              start: e.start,
              allDay: e.allDay,
              backgroundColor: e.color,
              borderColor: e.color,
            }))}
            eventClick={handleEventClick}
            datesSet={(info) => fetchEvents(info.start, info.end)}
            height="auto"
            dayMaxEvents={4}
          />
        </CardContent>
      </Card>

      <AddEntryDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        date={addDate}
        leads={leads}
        enquiries={enquiries}
        onSaved={reload}
      />

      {/* Personal note edit/delete */}
      <Dialog open={!!editEvent} onOpenChange={(v) => !v && setEditEvent(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit note</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-desc">Details</Label>
              <Textarea
                id="edit-desc"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-date">Date</Label>
              <Input
                id="edit-date"
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="sm:justify-between">
            <Button
              variant="ghost"
              onClick={removeNote}
              disabled={saving}
              className="gap-1.5 text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditEvent(null)} disabled={saving}>
                Cancel
              </Button>
              <Button
                onClick={saveEdit}
                disabled={saving}
                className="bg-[#dc2626] hover:bg-[#b91c1c] text-white"
              >
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
