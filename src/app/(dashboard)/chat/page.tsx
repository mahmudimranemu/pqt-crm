import { redirect } from "next/navigation";
import { auth, type ExtendedSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { toUserSlug } from "@/lib/utils";
import { MessageSquare } from "lucide-react";
import Link from "next/link";

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  SALES_MANAGER: "Senior Consultant",
  SALES_AGENT: "Consultant",
  VIEWER: "Viewer",
};

export default async function ChatPage() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) redirect("/login");

  const [contacts, unreadCounts] = await Promise.all([
    prisma.user.findMany({
      where: {
        isActive: true,
        id: { not: session.user.id },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
      },
      orderBy: [{ role: "asc" }, { firstName: "asc" }],
    }),
    prisma.userMessage.groupBy({
      by: ["senderId"],
      where: {
        receiverId: session.user.id,
        isRead: false,
      },
      _count: true,
    }),
  ]);

  const unreadByUser: Record<string, number> = {};
  for (const row of unreadCounts) {
    unreadByUser[row.senderId] = row._count;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
          <MessageSquare className="h-5 w-5 text-[#dc2626]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chat</h1>
          <p className="text-gray-500">Message your team members</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white">
        {contacts.length === 0 ? (
          <div className="py-16 text-center">
            <MessageSquare className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="text-gray-500">No contacts available</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {contacts.map((contact) => {
              const unread = unreadByUser[contact.id] || 0;
              return (
                <Link
                  key={contact.id}
                  href={`/users/${toUserSlug(contact.firstName, contact.lastName)}?tab=chat`}
                  className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-gray-50"
                >
                  <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#dc2626] text-sm font-semibold text-white">
                    {contact.firstName[0]}
                    {contact.lastName[0]}
                    {unread > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white ring-2 ring-white">
                        {unread}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium ${unread > 0 ? "text-gray-900 font-semibold" : "text-gray-900"}`}>
                      {contact.firstName} {contact.lastName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {roleLabels[contact.role] || contact.role}
                    </p>
                  </div>
                  {unread > 0 ? (
                    <span className="rounded-full bg-[#dc2626] px-2 py-0.5 text-[10px] font-bold text-white">
                      {unread} new
                    </span>
                  ) : (
                    <MessageSquare className="h-4 w-4 shrink-0 text-gray-400" />
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
