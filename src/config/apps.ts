import { Building2, Headset, Users, type LucideIcon } from "lucide-react";

/**
 * The three sibling apps that share one PQT login (cookie auth on
 * `.propertyquestturkey.com`). The sidebar app-switcher lets staff hop
 * between them without re-authenticating.
 *
 * URLs are env-overridable so dev/staging can point at localhost. The
 * current app (CRM) is marked `current` and rendered as the switcher's
 * resting label.
 */
export type AppLink = {
  key: "pms" | "crm" | "aftersales";
  name: string;
  /** Short hostname-style hint shown under the name. */
  host: string;
  href: string;
  icon: LucideIcon;
  current?: boolean;
};

const PMS_URL =
  process.env.NEXT_PUBLIC_PMS_URL ?? "https://pms.propertyquestturkey.com";
const AFTERSALES_URL =
  process.env.NEXT_PUBLIC_AFTERSALES_URL ??
  "https://aftersales.propertyquestturkey.com";

export const APP_LINKS: readonly AppLink[] = [
  {
    key: "pms",
    name: "PMS",
    host: "pms.propertyquestturkey.com",
    href: PMS_URL,
    icon: Building2,
  },
  {
    key: "crm",
    name: "CRM",
    host: "crm.propertyquestturkey.com",
    href: "/dashboard",
    icon: Users,
    current: true,
  },
  {
    key: "aftersales",
    name: "After Sales",
    host: "aftersales.propertyquestturkey.com",
    href: AFTERSALES_URL,
    icon: Headset,
  },
] as const;

export const CURRENT_APP = APP_LINKS.find((a) => a.current)!;
export const OTHER_APPS = APP_LINKS.filter((a) => !a.current);
