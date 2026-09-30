/**
 * PQT follow-up playbook for the lead Analysis button (CRM_LEAD_ANALYSIS.md
 * §3.3). Starting values — the sales team (Rafiq / the sales manager) confirm
 * or change them here, without touching the prompt logic.
 */
export const FOLLOW_UP_PLAYBOOK: string[] = [
  "Leave at least 5–7 days between unanswered follow-ups, unless the client asked for a specific time.",
  "After 4 unanswered attempts over 30 days, suggest the lead is cold and move to a slower, monthly check-in.",
  "A lead with a Spoken entry in the last 14 days and a stated interest is at least warm.",
  "If the client gave a reason for a pause (travel, family, waiting for funds), the next action must respect it — a light check-in, not a push.",
  "The first real conversation should aim to learn: purpose (living, investment, or citizenship eligibility), budget range, preferred area, and timeline.",
  "A light check-in with a client who is away or paused is a short WhatsApp message (or a quick call), not an email.",
  "If a next call date is already set for today or later and still fits what the client said, the next action happens on that date — don't push it back.",
];

/**
 * Values the AI may suggest in one-click updates. They match the dropdowns on
 * the lead page (lead-detail-fields.tsx) — the database stores free text.
 */
export const ALLOWED_TEMPERATURES = ["Cold", "Warm", "Hot"] as const;
export const ALLOWED_PRIORITIES = ["Low", "Medium", "High", "Urgent"] as const;
