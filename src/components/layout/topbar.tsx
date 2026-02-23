"use client";

import { signOut } from "next-auth/react";
import {
  LogOut,
  User,
  Settings,
  Search,
  Plus,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SearchCommand } from "@/components/search-command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getInitials } from "@/lib/utils";
import { TodayDropdown } from "./today-dropdown";
import { NotificationDropdown } from "./notification-dropdown";
import type { UserRole, Office } from "@prisma/client";

interface TopbarProps {
  user: {
    firstName: string;
    lastName: string;
    email: string;
    role: UserRole;
    office: Office;
  };
  unreadNotifications?: number;
}

export function Topbar({ user, unreadNotifications = 0 }: TopbarProps) {
  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white px-6">
      {/* Search Trigger */}
      <SearchCommand />
      <button
        onClick={() => {
          // Trigger Cmd+K programmatically
          document.dispatchEvent(
            new KeyboardEvent("keydown", { key: "k", metaKey: true }),
          );
        }}
        className="flex w-full max-w-md items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-400 transition-colors hover:bg-gray-100"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search leads, properties...</span>
        <kbd className="hidden rounded border bg-white px-1.5 py-0.5 text-xs font-mono text-gray-400 sm:inline-block">
          ⌘K
        </kbd>
      </button>

      {/* Right Side Actions */}
      <div className="flex items-center gap-3">
        {/* Today Button */}
        <TodayDropdown />

        {/* Add New Button */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              className="gap-2 bg-[#dc2626] hover:bg-[#b91c1c] text-white"
            >
              <Plus className="h-4 w-4" />
              Add New
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <a href="/clients/create">New Client</a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href="/leads/create">New Lead</a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href="/deals/create">New Deal</a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="/properties/create">New Property</a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href="/bookings/create">New Booking</a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href="/sales/create">New Sale</a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <NotificationDropdown unreadCount={unreadNotifications} />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-gray-200 text-gray-600 text-sm">
                  {getInitials(user.firstName, user.lastName)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="/settings/profile" className="flex items-center">
                <User className="mr-2 h-4 w-4" />
                Profile
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href="/settings" className="flex items-center">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-red-600 focus:text-red-600"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <ChevronDown className="h-4 w-4 text-gray-400" />
      </div>
    </header>
  );
}
