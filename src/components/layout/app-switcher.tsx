"use client";

import { ChevronsUpDown, ExternalLink } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { APP_LINKS, CURRENT_APP } from "@/config/apps";

/**
 * Top-of-sidebar app switcher (red CRM theme).
 *
 * Resting state shows the current app (CRM). Clicking opens a menu listing all
 * three sibling apps — selecting PMS or After Sales navigates there. The shared
 * `.propertyquestturkey.com` session means no second login.
 */
export function AppSwitcher({ collapsed = false }: { collapsed?: boolean }) {
  const Current = CURRENT_APP.icon;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title="Switch app"
          className={cn(
            "flex w-full items-center gap-2.5 rounded-lg bg-white/15 px-3 py-2 text-left text-white transition-colors hover:bg-white/25",
            collapsed && "justify-center px-0",
          )}
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-white text-[#dc2626]">
            <Current className="h-5 w-5" />
          </span>
          {!collapsed && (
            <>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold leading-tight">
                  {CURRENT_APP.name}
                </span>
                <span className="block truncate text-[11px] leading-tight text-white/70">
                  {CURRENT_APP.host}
                </span>
              </span>
              <ChevronsUpDown className="h-4 w-4 shrink-0 text-white/70" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Switch app
        </DropdownMenuLabel>
        {APP_LINKS.map((app) => {
          const Icon = app.icon;
          const isExternal = !app.current;
          return (
            <DropdownMenuItem key={app.key} asChild disabled={app.current}>
              <a
                href={app.href}
                {...(isExternal ? { rel: "noopener" } : {})}
                className="flex items-center gap-2.5"
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-muted text-[#dc2626]">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium leading-tight">
                    {app.name}
                  </span>
                  <span className="block truncate text-[11px] leading-tight text-muted-foreground">
                    {app.current ? "Current app" : app.host}
                  </span>
                </span>
                {isExternal && (
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
              </a>
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <p className="px-2 py-1 text-[11px] text-muted-foreground">
          One login works across all three.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
