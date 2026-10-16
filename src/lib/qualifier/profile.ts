/** Shared between the admin screen and its server actions. */

export const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type Day = (typeof DAYS)[number];
export const DAY_LABELS: Record<Day, string> = {
  mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday",
  fri: "Friday", sat: "Saturday", sun: "Sunday",
};

/** Working hours in the agent's own timezone, e.g. { mon: [{ start: "09:00", end: "18:00" }] }. */
export type WeeklySchedule = Partial<Record<Day, { start: string; end: string }[]>>;

/** Quick-pick suggestions in the admin screen — any other value can be typed. */
export const LANGUAGE_SUGGESTIONS = ["English", "Turkish", "Arabic", "Russian", "Persian", "Urdu", "Bengali", "Chinese", "French", "German"];
export const SPECIALTY_SUGGESTIONS = ["citizenship", "investment", "high_budget", "rental", "off_plan", "resale"];
export const TIMEZONES = [
  "Europe/Istanbul", "Asia/Dubai", "Asia/Riyadh", "Asia/Qatar", "Asia/Kuwait", "Asia/Tehran",
  "Europe/London", "Europe/Berlin", "Europe/Moscow", "Asia/Karachi", "Asia/Dhaka",
  "Asia/Kuala_Lumpur", "Asia/Shanghai", "America/New_York",
];
