import { z } from "zod";

/** Input shapes for /api/automation/* — kept in one place so the n8n
 *  workflows and the CRM agree on them. */

const id = z.string().min(1).max(64);
const shortText = z.string().max(300);
const jsonObject = z.record(z.string(), z.unknown());

export const TIERS = ["hot", "warm", "cold", "junk"] as const;

export const qualificationInput = z.object({
  enquiryId: id,
  score: z.number().int().min(0).max(100),
  tier: z.enum(TIERS),
  scoreReasons: z.array(shortText).max(50).default([]),
  extractedData: jsonObject.optional(),
  aiSummary: z.string().max(2000).nullish(),
  isDuplicate: z.boolean().default(false),
  duplicateOf: shortText.nullish(),
  suggestedAgentId: id.nullish(),
  backupAgentId: id.nullish(),
  suggestionReasons: z.array(shortText).max(20).default([]),
  suggestionScoreBreakdown: jsonObject.optional(),
  rulesVersion: z.number().int().min(1),
});

export const NOTIFICATION_KINDS = ["new_inquiry", "reminder", "escalation", "error", "weekly_report"] as const;

export const notificationInput = z.object({
  enquiryId: id.nullish(),
  channel: z.enum(["telegram", "email"]),
  kind: z.enum(NOTIFICATION_KINDS),
  recipientUserId: id.nullish(),
  dedupeKey: z.string().min(1).max(200).nullish(),
  externalMessageId: z.string().max(100).nullish(),
  deliveryStatus: z.enum(["sent", "failed"]),
  errorMessage: z.string().max(1000).nullish(),
  sentAt: z.iso.datetime({ offset: true }).optional(),
});

export const decisionInput = z.object({
  enquiryId: id,
  chosenAgentId: id,
  /** The Telegram chat that pressed the button — must belong to a senior consultant. */
  telegramChatId: z.string().min(1).max(64),
  /** Telegram message id of the alert, to stamp responseAt on the notification. */
  externalMessageId: z.string().max(100).nullish(),
});

const count = z.number().int().min(0).max(100_000).default(0);

export const digestInput = z.object({
  digests: z
    .array(
      z.object({
        userId: id,
        date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
          .refine((s) => {
            const d = new Date(`${s}T00:00:00Z`);
            return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
          }, "Not a real date"),
        callsLogged: count,
        notesLogged: count,
        tasksCompleted: count,
        inquiriesHandled: count,
        leadsConverted: count,
        dealsWon: count,
        dealsLost: count,
        avgFirstResponseMinutes: z.number().min(0).max(1_000_000).nullish(),
        openLeadCount: count,
        rollingStats: jsonObject.optional(),
        lowData: z.boolean().default(false),
        aiSummary: z.string().max(1000).nullish(),
      }),
    )
    .min(1)
    .max(200),
});
