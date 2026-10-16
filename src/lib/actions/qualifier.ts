"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { auth, type ExtendedSession } from "@/lib/auth";
import {
  automationSecret,
  qualifierEnabled,
  qualifierMode,
  qualifierStartDate,
} from "@/lib/qualifier/config";
import { qualifierAudit } from "@/lib/qualifier/audit";
import { qualifierUserWhere } from "@/lib/qualifier/data";
import { DAYS, type WeeklySchedule } from "@/lib/qualifier/profile";

const PAGE = "/settings/qualifier";

/** The Inquiry Qualifier admin screen is Super Admin only. */
async function requireSuperAdmin(): Promise<ExtendedSession> {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user || session.user.role !== "SUPER_ADMIN") throw new Error("Unauthorized");
  return session;
}


export type AgentRow = {
  userId: string;
  name: string;
  role: string;
  office: string;
  profile: {
    languages: string[];
    strongCountries: string[];
    specialties: string[];
    timezone: string;
    weeklySchedule: WeeklySchedule | null;
    isAvailable: boolean;
    isSeniorConsultant: boolean;
    telegramChatId: string | null;
    maxOpenLeads: number | null;
  } | null;
  timeOff: { id: string; startsAt: string; endsAt: string; reason: string | null }[];
};

export type QualificationRow = {
  id: string;
  refId: string | null;
  source: string;
  enquiryCreatedAt: string;
  score: number;
  tier: string;
  scoreReasons: string[];
  isDuplicate: boolean;
  duplicateOf: string | null;
  suggestedAgent: string | null;
  backupAgent: string | null;
  finalAgent: string | null;
  suggestionReasons: string[];
  aiSummary: string | null;
  mode: string;
  status: string;
  qualifiedAt: string;
  rulesVersion: number;
};

export async function getQualifierAdminData() {
  await requireSuperAdmin();
  const now = new Date();

  const [users, qualifications, activeRules] = await Promise.all([
    prisma.user.findMany({
      where: qualifierUserWhere(),
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        office: true,
        agentProfile: true,
        agentTimeOff: {
          where: { endsAt: { gte: now } },
          orderBy: { startsAt: "asc" },
          select: { id: true, startsAt: true, endsAt: true, reason: true },
        },
      },
    }),
    prisma.inquiryQualification.findMany({ orderBy: { qualifiedAt: "desc" }, take: 50 }),
    prisma.qualifierRules.findFirst({ where: { isActive: true }, select: { version: true } }),
  ]);

  // Names for suggested/final agents, including anyone no longer listed above.
  const agentIds = new Set<string>();
  for (const q of qualifications) {
    for (const v of [q.suggestedAgentId, q.backupAgentId, q.finalAgentId]) if (v) agentIds.add(v);
  }
  const named = await prisma.user.findMany({
    where: { id: { in: [...agentIds] } },
    select: { id: true, firstName: true, lastName: true },
  });
  const nameOf = new Map(named.map((u) => [u.id, `${u.firstName} ${u.lastName}`.trim()]));
  const name = (id: string | null) => (id ? nameOf.get(id) ?? "Unknown user" : null);

  const agents: AgentRow[] = users.map((u) => ({
    userId: u.id,
    name: `${u.firstName} ${u.lastName}`.trim(),
    role: u.role,
    office: u.office,
    profile: u.agentProfile && {
      languages: u.agentProfile.languages,
      strongCountries: u.agentProfile.strongCountries,
      specialties: u.agentProfile.specialties,
      timezone: u.agentProfile.timezone,
      weeklySchedule: (u.agentProfile.weeklySchedule as WeeklySchedule | null) ?? null,
      isAvailable: u.agentProfile.isAvailable,
      isSeniorConsultant: u.agentProfile.isSeniorConsultant,
      telegramChatId: u.agentProfile.telegramChatId,
      maxOpenLeads: u.agentProfile.maxOpenLeads,
    },
    timeOff: u.agentTimeOff.map((t) => ({
      id: t.id,
      startsAt: t.startsAt.toISOString(),
      endsAt: t.endsAt.toISOString(),
      reason: t.reason,
    })),
  }));

  const results: QualificationRow[] = qualifications.map((q) => ({
    id: q.id,
    refId: q.enquiryRefId,
    source: q.enquirySource,
    enquiryCreatedAt: q.enquiryCreatedAt.toISOString(),
    score: q.score,
    tier: q.tier,
    scoreReasons: q.scoreReasons,
    isDuplicate: q.isDuplicate,
    duplicateOf: q.duplicateOf,
    suggestedAgent: name(q.suggestedAgentId),
    backupAgent: name(q.backupAgentId),
    finalAgent: name(q.finalAgentId),
    suggestionReasons: q.suggestionReasons,
    aiSummary: q.aiSummary,
    mode: q.mode,
    status: q.status,
    qualifiedAt: q.qualifiedAt.toISOString(),
    rulesVersion: q.rulesVersion,
  }));

  return {
    status: {
      enabled: qualifierEnabled(),
      mode: qualifierMode(),
      startDate: qualifierStartDate()?.toISOString() ?? null,
      secretSet: !!automationSecret(),
      rulesVersion: activeRules?.version ?? null,
    },
    agents,
    results,
  };
}

// ---------------------------------------------------------------------------
// Saving
// ---------------------------------------------------------------------------

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM");
const listItem = z.string().trim().min(1).max(60);

const profileInput = z.object({
  languages: z.array(listItem).max(20),
  strongCountries: z.array(listItem).max(50),
  specialties: z.array(listItem).max(20),
  timezone: z.string().refine((tz) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }, "Unknown timezone"),
  weeklySchedule: z
    .partialRecord(
      z.enum(DAYS),
      z
        .array(z.object({ start: hhmm, end: hhmm }).refine((s) => s.start < s.end, "End must be after start"))
        .max(3),
    )
    .nullable(),
  isAvailable: z.boolean(),
  isSeniorConsultant: z.boolean(),
  telegramChatId: z
    .string()
    .trim()
    .regex(/^-?\d{1,20}$/, "A Telegram chat ID is a number")
    .nullable(),
  maxOpenLeads: z.number().int().min(1).max(10_000).nullable(),
});
export type AgentProfileInput = z.infer<typeof profileInput>;

function firstIssue(e: z.ZodError): string {
  const i = e.issues[0];
  return i ? `${i.path.join(".") || "input"}: ${i.message}` : "Invalid input";
}

export async function saveAgentProfile(userId: string, input: AgentProfileInput) {
  const session = await requireSuperAdmin();
  const parsed = profileInput.safeParse(input);
  if (!parsed.success) throw new Error(firstIssue(parsed.error));
  const data = {
    ...parsed.data,
    weeklySchedule: parsed.data.weeklySchedule ?? Prisma.DbNull,
    telegramChatId: parsed.data.telegramChatId || null,
  };

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) throw new Error("User not found");

  try {
    await prisma.agentProfile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new Error("That Telegram chat ID is already used by another agent");
    }
    throw e;
  }

  await qualifierAudit({
    actor: `user:${session.user.id}`,
    action: "admin.saveAgentProfile",
    outcome: "ok",
    summary: { userId, isSeniorConsultant: data.isSeniorConsultant, isAvailable: data.isAvailable },
  });
  revalidatePath(PAGE);
}

const timeOffInput = z
  .object({
    startsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    reason: z.string().trim().max(200).nullable(),
  })
  .refine((t) => t.startsAt <= t.endsAt, "The last day can't be before the first day");

/** Adds leave from the first day 00:00 to the end of the last day,
 *  Istanbul time (both days included). */
export async function addAgentTimeOff(userId: string, input: z.infer<typeof timeOffInput>) {
  const session = await requireSuperAdmin();
  const parsed = timeOffInput.safeParse(input);
  if (!parsed.success) throw new Error(firstIssue(parsed.error));

  const startsAt = new Date(`${parsed.data.startsAt}T00:00:00+03:00`);
  const endsAt = new Date(new Date(`${parsed.data.endsAt}T00:00:00+03:00`).getTime() + 86_400_000);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) throw new Error("Invalid date");

  await prisma.agentTimeOff.create({
    data: { userId, startsAt, endsAt, reason: parsed.data.reason || null, createdById: session.user.id },
  });
  await qualifierAudit({
    actor: `user:${session.user.id}`,
    action: "admin.addTimeOff",
    outcome: "ok",
    summary: { userId, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() },
  });
  revalidatePath(PAGE);
}

export async function deleteAgentTimeOff(id: string) {
  const session = await requireSuperAdmin();
  const row = await prisma.agentTimeOff.findUnique({ where: { id }, select: { userId: true } });
  if (!row) return;
  await prisma.agentTimeOff.delete({ where: { id } });
  await qualifierAudit({
    actor: `user:${session.user.id}`,
    action: "admin.deleteTimeOff",
    outcome: "ok",
    summary: { userId: row.userId, timeOffId: id },
  });
  revalidatePath(PAGE);
}
