import { Suspense } from "react";
import Link from "next/link";
import { auth, type ExtendedSession } from "@/lib/auth";
import {
  getBookingStats,
  getFutureBookings,
  getPendingBookings,
} from "@/lib/actions/bookings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CalendarDays,
  Clock,
  CheckCircle,
  Target,
  TrendingUp,
  Plus,
  CalendarRange,
  BarChart3,
  XCircle,
  Handshake,
  ArrowRight,
} from "lucide-react";
import { BookingTable } from "./booking-table";

const bookingCategories = [
  {
    title: "Future Bookings",
    description: "Upcoming property viewings and appointments",
    icon: CalendarDays,
    color: "text-blue-600",
    bg: "bg-blue-50",
    href: "/bookings/future",
  },
  {
    title: "Pending Bookings",
    description: "Bookings awaiting completion or outcome",
    icon: Clock,
    color: "text-amber-600",
    bg: "bg-amber-50",
    href: "/bookings/pending",
  },
  {
    title: "Sales",
    description: "Bookings that resulted in a successful sale",
    icon: CheckCircle,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    href: "/bookings/sales",
  },
  {
    title: "No Sales",
    description: "Bookings where clients were not interested",
    icon: XCircle,
    color: "text-red-600",
    bg: "bg-red-50",
    href: "/bookings/no-sales",
  },
  {
    title: "Need to Close",
    description: "Bookings with offers made, awaiting close",
    icon: Handshake,
    color: "text-purple-600",
    bg: "bg-purple-50",
    href: "/bookings/need-to-close",
  },
  {
    title: "Calendar View",
    description: "View all bookings in a calendar layout",
    icon: CalendarRange,
    color: "text-teal-600",
    bg: "bg-teal-50",
    href: "/bookings/calendar",
  },
  {
    title: "Statistics",
    description: "Booking performance and conversion metrics",
    icon: BarChart3,
    color: "text-pink-600",
    bg: "bg-pink-50",
    href: "/bookings/stats",
  },
];

async function BookingStatsCards() {
  const stats = await getBookingStats();

  const monthChange =
    stats.lastMonthBookings > 0
      ? ((stats.thisMonthBookings - stats.lastMonthBookings) /
          stats.lastMonthBookings) *
        100
      : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <Card className="border border-gray-200">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Bookings</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {stats.totalBookings}
              </p>
            </div>
            <CalendarDays className="h-5 w-5 text-[#dc2626]" />
          </div>
        </CardContent>
      </Card>
      <Card className="border border-gray-200">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">This Month</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {stats.thisMonthBookings}
              </p>
              <p className="text-xs text-gray-400">
                {monthChange >= 0 ? "+" : ""}
                {monthChange.toFixed(1)}% vs last month
              </p>
            </div>
            <TrendingUp
              className={`h-5 w-5 ${monthChange >= 0 ? "text-emerald-500" : "text-red-500"}`}
            />
          </div>
        </CardContent>
      </Card>
      <Card className="border border-gray-200">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Completed</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {stats.completedBookings}
              </p>
            </div>
            <CheckCircle className="h-5 w-5 text-emerald-500" />
          </div>
        </CardContent>
      </Card>
      <Card className="border border-gray-200">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Sales</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {stats.soldBookings}
              </p>
            </div>
            <Target className="h-5 w-5 text-blue-500" />
          </div>
        </CardContent>
      </Card>
      <Card className="border border-gray-200">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Conversion</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {stats.conversionRate.toFixed(1)}%
              </p>
            </div>
            <TrendingUp className="h-5 w-5 text-[#dc2626]" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

async function AllBookingsTable({ userRole }: { userRole: string }) {
  const [futureData, pendingData] = await Promise.all([
    getFutureBookings({ limit: 50 }),
    getPendingBookings({ limit: 50 }),
  ]);

  const allBookings = [...pendingData.bookings, ...futureData.bookings];

  // Deduplicate by id in case a booking appears in both queries
  const uniqueBookings = Array.from(
    new Map(allBookings.map((b) => [b.id, b])).values()
  );

  // Sort by booking date ascending
  uniqueBookings.sort(
    (a, b) =>
      new Date(a.bookingDate).getTime() - new Date(b.bookingDate).getTime()
  );

  const totalCount = uniqueBookings.length;

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          {totalCount} active booking{totalCount !== 1 ? "s" : ""} (pending +
          upcoming)
        </p>
      </div>
      <BookingTable bookings={uniqueBookings} userRole={userRole} />
    </>
  );
}

export default async function BookingsPage() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) return null;

  const userRole = session.user.role || "VIEWER";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
            <CalendarDays className="h-5 w-5 text-[#dc2626]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
            <p className="text-gray-500">
              Manage property viewings, appointments, and outcomes
            </p>
          </div>
        </div>
        {userRole !== "VIEWER" && (
          <Link href="/bookings/create">
            <Button className="gap-2 bg-[#dc2626] hover:bg-[#b91c1c] text-white">
              <Plus className="h-4 w-4" />
              New Booking
            </Button>
          </Link>
        )}
      </div>

      {/* Stats Overview */}
      <Suspense
        fallback={
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-[100px] w-full rounded-lg" />
            ))}
          </div>
        }
      >
        <BookingStatsCards />
      </Suspense>

      {/* Navigation Cards */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Booking Categories
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {bookingCategories.map((category) => (
            <Link key={category.title} href={category.href}>
              <Card className="border border-gray-200 transition-all hover:shadow-lg hover:border-gray-300 cursor-pointer h-full group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${category.bg}`}
                    >
                      <category.icon
                        className={`h-5 w-5 ${category.color}`}
                      />
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-gray-900">
                    {category.title}
                  </h3>
                  <p className="mt-1 text-xs text-gray-500">
                    {category.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* All Active Bookings Table */}
      <Card className="border border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <Clock className="h-5 w-5 text-[#dc2626]" />
            Active Bookings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
            <AllBookingsTable userRole={userRole} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
