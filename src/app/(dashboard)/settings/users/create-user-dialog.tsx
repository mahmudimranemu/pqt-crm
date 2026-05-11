"use client";

import { Button } from "@/components/ui/button";
import { ExternalLink, UserPlus } from "lucide-react";

/**
 * Post-migration shim.
 *
 * User creation now lives in PMS (the identity authority). PMS issues the
 * UUID and emits a webhook so the CRM mirror auto-populates within ~1s.
 * Creating users directly via Prisma in the CRM would desync from PMS.
 *
 * The file keeps its old name + export signature so the parent page.tsx
 * stays unchanged.
 */
const PMS_URL =
  process.env.NEXT_PUBLIC_PMS_URL ?? "https://pms.propertyquestturkey.com";

export function CreateUserDialog(_props: { userRole?: string }) {
  return (
    <Button
      asChild
      className="bg-[#dc2626] hover:bg-[#dc2626]/90"
      title="Opens PMS in a new tab — user management lives there now."
    >
      <a
        href={`${PMS_URL}/admin/users/new`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <UserPlus className="h-4 w-4 mr-2" />
        Add User
        <ExternalLink className="h-3.5 w-3.5 ml-1.5 opacity-70" />
      </a>
    </Button>
  );
}
