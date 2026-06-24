import { NextRequest, NextResponse } from "next/server";
import { getCalendarEvents } from "@/lib/actions/calendar";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    if (!start || !end) {
      return NextResponse.json(
        { error: "Start and end dates are required" },
        { status: 400 },
      );
    }

    const events = await getCalendarEvents(new Date(start), new Date(end));
    return NextResponse.json(events);
  } catch (error) {
    console.error("Failed to fetch calendar events:", error);
    return NextResponse.json(
      { error: "Failed to fetch calendar events" },
      { status: 500 },
    );
  }
}
