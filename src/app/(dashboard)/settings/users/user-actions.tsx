"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, UserX, UserCheck, Key } from "lucide-react";
import { deactivateUser, reactivateUser } from "@/lib/actions/users";
import type { UserRole, Office } from "@prisma/client";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  office: Office;
  isActive: boolean;
}

interface UserActionsProps {
  user: User;
}

export function UserActions({ user }: UserActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleActive = async () => {
    try {
      setIsLoading(true);
      if (user.isActive) {
        await deactivateUser(user.id);
      } else {
        await reactivateUser(user.id);
      }
      router.refresh();
    } catch (error) {
      console.error("Failed to update user status:", error);
      alert("Failed to update user status");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={isLoading}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleToggleActive}>
          {user.isActive ? (
            <>
              <UserX className="h-4 w-4 mr-2" />
              Deactivate
            </>
          ) : (
            <>
              <UserCheck className="h-4 w-4 mr-2" />
              Reactivate
            </>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
