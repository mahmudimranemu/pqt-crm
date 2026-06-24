import { getCalendarLinkOptions } from "@/lib/actions/calendar";
import { CalendarView } from "./calendar-view";

export default async function CalendarPage() {
  const { leads, enquiries } = await getCalendarLinkOptions();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
        <p className="text-muted-foreground">
          Your notes, tasks, and follow-ups on a calendar. Click any day to add a
          note or task.
        </p>
      </div>

      <CalendarView leads={leads} enquiries={enquiries} />
    </div>
  );
}
