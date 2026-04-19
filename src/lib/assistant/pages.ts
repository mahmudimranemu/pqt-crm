export interface AssistantPage {
  slash: string;
  label: string;
  href: string;
  description: string;
}

export const ASSISTANT_PAGES: AssistantPage[] = [
  { slash: "/dashboard", label: "Dashboard", href: "/dashboard", description: "Main KPI dashboard" },
  { slash: "/leads", label: "Leads", href: "/leads", description: "Lead pipeline" },
  { slash: "/deals", label: "Deals", href: "/deals", description: "Deal pipeline" },
  { slash: "/clients", label: "Clients", href: "/clients", description: "Client list" },
  { slash: "/enquiries", label: "Enquiries", href: "/clients/enquiries", description: "Enquiries inbox" },
  { slash: "/properties", label: "Properties", href: "/properties", description: "Properties catalog" },
  { slash: "/tasks", label: "Tasks", href: "/tasks", description: "Tasks list" },
  { slash: "/payments", label: "Payments", href: "/payments", description: "Payment tracking" },
  { slash: "/commissions", label: "Commissions", href: "/commissions", description: "Commission tracking" },
  { slash: "/campaigns", label: "Campaigns", href: "/campaigns", description: "Marketing campaigns" },
  { slash: "/reports", label: "Reports", href: "/reports", description: "Reports hub" },
  { slash: "/notifications", label: "Notifications", href: "/notifications", description: "Notification feed" },
  { slash: "/users", label: "Users", href: "/settings/users", description: "User management" },
  { slash: "/teams", label: "Teams", href: "/settings/teams", description: "Team management" },
  { slash: "/audit", label: "Audit Log", href: "/settings/audit", description: "Audit log" },
  { slash: "/integrations", label: "Integrations", href: "/settings/integrations", description: "API keys" },
  { slash: "/ai", label: "AI Settings", href: "/settings/ai", description: "AI provider settings" },
];
