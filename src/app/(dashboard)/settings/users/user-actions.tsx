"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ExternalLink, MoreHorizontal, Pencil } from "lucide-react";
import type { UserRole, Office } from "@prisma/client";

/**
 * Post-migration: PMS is the identity authority. Edits made directly to
 * the CRM mirror would be overwritten on the next webhook sync from PMS,
 * and there is no longer a usable local password to reset. So this menu
 * only exposes "Edit in PMS" — which opens PMS's user-edit page in a new
 * tab. The webhook keeps the CRM mirror in sync (~1s after the PMS save).
 *
 * Deactivate / delete / reset password removed. Same actions live in PMS.
 */

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  role: UserRole;
  office: Office;
  isActive: boolean;
}

const PMS_URL =
  process.env.NEXT_PUBLIC_PMS_URL ?? "https://pms.propertyquestturkey.com";

export function UserActions({
  user,
  currentUserRole = "SUPER_ADMIN",
}: {
  user: User;
  currentUserRole?: string;
}) {
  const isCurrentAdmin = currentUserRole === "ADMIN";
  const adminAllowedRoles = ["ADMIN", "SALES_MANAGER", "SALES_AGENT"];
  const canManageUser =
    currentUserRole === "SUPER_ADMIN" ||
    (isCurrentAdmin && adminAllowedRoles.includes(user.role));

  if (!canManageUser) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <a
            href={`${PMS_URL}/admin/users/${user.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center"
          >
            <Pencil className="h-4 w-4 mr-2" />
            Edit in PMS
            <ExternalLink className="h-3.5 w-3.5 ml-auto opacity-60" />
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
