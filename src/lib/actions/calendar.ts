"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { auth, type ExtendedSession } from "@/lib/auth";

/** One item on the personal calendar. `start` is a local YYYY-MM-DD day. */
export interface CalendarEvent {
  id: string; // prefixed by type, e.g. "task_abc"
  type:
    | "task"
    | "lead_note"
    | "enquiry_note"
    | "lead_followup"
    | "enquiry_followup"
    | "note";
  title: string;
  start: string;
  allDay: boolean;
  color: string;
  href: string | null;
  /** Raw record id (un-prefixed) — used to edit/delete personal notes. */
  recordId: string;
  /** Only populated for personal notes (type === "note"), for the edit dialog. */
  description?: string | null;
}

const COLORS = {
  task: "#dc2626",
  lead_note: "#2563eb",
  enquiry_note: "#7c3aed",
  lead_followup: "#f59e0b",
  enquiry_followup: "#0891b2",
  note: "#16a34a",
} as const;

/** Local Y-M-D for a Date (day-granular calendar placement). */
function localDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * All calendar items for the current user within [start, end). SUPER_ADMIN sees
 * everyone's; everyone else sees only their own (lead.ownerId /
 * enquiry.assignedAgentId / task.assigneeId / calendarNote.userId).
 */
export async function getCalendarEvents(
  start: Date,
  end: Date,
): Promise<CalendarEvent[]> {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const me = session.user.id;
  const viewAll = session.user.role === "SUPER_ADMIN";
  const range = { gte: start, lt: end };

  const [tasks, leadNotes, enquiryNotes, leadFollowUps, enquiryFollowUps, notes] =
    await Promise.all([
      prisma.task.findMany({
        where: {
          dueDate: range,
          ...(viewAll ? {} : { assigneeId: me }),
        },
        select: {
          id: true,
          title: true,
          dueDate: true,
          leadId: true,
        },
      }),
      prisma.leadNote.findMany({
        where: {
          createdAt: range,
          ...(viewAll ? {} : { lead: { ownerId: me } }),
        },
        select: {
          id: true,
          content: true,
          createdAt: true,
          leadId: true,
          lead: { select: { title: true } },
        },
      }),
      prisma.enquiryNote.findMany({
        where: {
          createdAt: range,
          ...(viewAll ? {} : { enquiry: { assignedAgentId: me } }),
        },
        select: {
          id: true,
          content: true,
          createdAt: true,
          enquiryId: true,
          enquiry: { select: { firstName: true, lastName: true } },
        },
      }),
      prisma.lead.findMany({
        where: {
          nextCallDate: range,
          ...(viewAll ? {} : { ownerId: me }),
        },
        select: { id: true, title: true, nextCallDate: true },
      }),
      prisma.enquiry.findMany({
        where: {
          nextCallDate: range,
          ...(viewAll ? {} : { assignedAgentId: me }),
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          nextCallDate: true,
        },
      }),
      prisma.calendarNote.findMany({
        where: {
          date: range,
          ...(viewAll ? {} : { userId: me }),
        },
        select: {
          id: true,
          title: true,
          description: true,
          date: true,
          leadId: true,
          enquiryId: true,
        },
      }),
    ]);

  const events: CalendarEvent[] = [];

  for (const t of tasks) {
    if (!t.dueDate) continue;
    events.push({
      id: `task_${t.id}`,
      type: "task",
      title: `📋 ${t.title}`,
      start: localDay(t.dueDate),
      allDay: true,
      color: COLORS.task,
      href: t.leadId ? `/leads/${t.leadId}` : "/tasks",
      recordId: t.id,
    });
  }

  const stripPrefix = (s: string) => s.replace(/^\[[A-Z]+\]\s*/, "");
  for (const n of leadNotes) {
    events.push({
      id: `leadnote_${n.id}`,
      type: "lead_note",
      title: `📝 ${n.lead?.title ?? "Lead"}: ${stripPrefix(n.content).slice(0, 40)}`,
      start: localDay(n.createdAt),
      allDay: true,
      color: COLORS.lead_note,
      href: n.leadId ? `/leads/${n.leadId}` : null,
      recordId: n.id,
    });
  }

  for (const n of enquiryNotes) {
    const who = n.enquiry
      ? `${n.enquiry.firstName} ${n.enquiry.lastName}`
      : "Enquiry";
    events.push({
      id: `enqnote_${n.id}`,
      type: "enquiry_note",
      title: `📨 ${who}: ${stripPrefix(n.content).slice(0, 40)}`,
      start: localDay(n.createdAt),
      allDay: true,
      color: COLORS.enquiry_note,
      href: n.enquiryId ? `/clients/enquiries/${n.enquiryId}` : null,
      recordId: n.id,
    });
  }

  for (const l of leadFollowUps) {
    if (!l.nextCallDate) continue;
    events.push({
      id: `leadcall_${l.id}`,
      type: "lead_followup",
      title: `📞 ${l.title}`,
      start: localDay(l.nextCallDate),
      allDay: true,
      color: COLORS.lead_followup,
      href: `/leads/${l.id}`,
      recordId: l.id,
    });
  }

  for (const e of enquiryFollowUps) {
    if (!e.nextCallDate) continue;
    events.push({
      id: `enqcall_${e.id}`,
      type: "enquiry_followup",
      title: `📞 ${e.firstName} ${e.lastName}`,
      start: localDay(e.nextCallDate),
      allDay: true,
      color: COLORS.enquiry_followup,
      href: `/clients/enquiries/${e.id}`,
      recordId: e.id,
    });
  }

  for (const c of notes) {
    events.push({
      id: `note_${c.id}`,
      type: "note",
      title: c.title,
      start: localDay(c.date),
      allDay: true,
      color: COLORS.note,
      href: c.leadId
        ? `/leads/${c.leadId}`
        : c.enquiryId
          ? `/clients/enquiries/${c.enquiryId}`
          : null,
      recordId: c.id,
      description: c.description,
    });
  }

  return events;
}

/** Leads + enquiries the current user can link a calendar note to. */
export async function getCalendarLinkOptions() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  const me = session.user.id;
  const viewAll = session.user.role === "SUPER_ADMIN";

  const [leads, enquiries] = await Promise.all([
    prisma.lead.findMany({
      where: viewAll ? {} : { ownerId: me },
      select: { id: true, title: true },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
    prisma.enquiry.findMany({
      where: viewAll ? {} : { assignedAgentId: me },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
  ]);

  return {
    leads: leads.map((l) => ({ id: l.id, label: l.title })),
    enquiries: enquiries.map((e) => ({
      id: e.id,
      label: `${e.firstName} ${e.lastName}`,
    })),
  };
}

export async function createCalendarNote(data: {
  date: string; // YYYY-MM-DD
  title: string;
  description?: string;
  leadId?: string;
  enquiryId?: string;
}) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role === "VIEWER") throw new Error("Unauthorized");
  if (!data.title.trim()) throw new Error("Title is required");

  const note = await prisma.calendarNote.create({
    data: {
      userId: session.user.id,
      date: new Date(`${data.date}T12:00:00`),
      title: data.title.trim(),
      description: data.description?.trim() || null,
      leadId: data.leadId || null,
      enquiryId: data.enquiryId || null,
    },
  });

  revalidatePath("/calendar");
  return note;
}

export async function updateCalendarNote(
  id: string,
  data: { title?: string; description?: string; date?: string },
) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const existing = await prisma.calendarNote.findUnique({
    where: { id },
    select: { userId: true },
  });
  if (!existing) throw new Error("Note not found");
  if (existing.userId !== session.user.id && session.user.role !== "SUPER_ADMIN") {
    throw new Error("Unauthorized");
  }

  const note = await prisma.calendarNote.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title.trim() } : {}),
      ...(data.description !== undefined
        ? { description: data.description.trim() || null }
        : {}),
      ...(data.date ? { date: new Date(`${data.date}T12:00:00`) } : {}),
    },
  });

  revalidatePath("/calendar");
  return note;
}

export async function deleteCalendarNote(id: string) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const existing = await prisma.calendarNote.findUnique({
    where: { id },
    select: { userId: true },
  });
  if (!existing) throw new Error("Note not found");
  if (existing.userId !== session.user.id && session.user.role !== "SUPER_ADMIN") {
    throw new Error("Unauthorized");
  }

  await prisma.calendarNote.delete({ where: { id } });
  revalidatePath("/calendar");
}
