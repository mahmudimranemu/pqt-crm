import { NextRequest, NextResponse } from "next/server";
import { getBookingsForCalendar } from "@/lib/actions/bookings";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    if (!start || !end) {
      return NextResponse.json(
        { error: "Start and end dates are required" },
        { status: 400 }
      );
    }

    const bookings = await getBookingsForCalendar(
      new Date(start),
      new Date(end)
    );

    return NextResponse.json(bookings);
  } catch (error) {
    console.error("Failed to fetch calendar bookings:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookings" },
      { status: 500 }
    );
  }
}
