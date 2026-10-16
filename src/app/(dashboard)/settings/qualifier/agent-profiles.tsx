"use client";

import { useState, useTransition } from "react";
import { CalendarOff, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  addAgentTimeOff,
  deleteAgentTimeOff,
  saveAgentProfile,
  type AgentRow,
} from "@/lib/actions/qualifier";
import {
  DAYS,
  DAY_LABELS,
  LANGUAGE_SUGGESTIONS,
  SPECIALTY_SUGGESTIONS,
  TIMEZONES,
  type Day,
  type WeeklySchedule,
} from "@/lib/qualifier/profile";

const roleLabel = (r: string) => r.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

const dateFmt = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Istanbul" });

/** Last day of leave: endsAt is the midnight after it. */
const lastDayFmt = (iso: string) => dateFmt(new Date(new Date(iso).getTime() - 1).toISOString());

function hoursSummary(s: WeeklySchedule | null): string {
  if (!s) return "Not set";
  const on = DAYS.filter((d) => s[d]?.length);
  if (on.length === 0) return "No working days";
  const first = s[on[0]]![0];
  const same = on.every((d) => s[d]![0].start === first.start && s[d]![0].end === first.end);
  const days = on.map((d) => DAY_LABELS[d].slice(0, 3)).join(", ");
  return same ? `${days} · ${first.start}–${first.end}` : `${days} · varies`;
}

function errorText(e: unknown) {
  return e instanceof Error ? e.message : "Unknown error";
}

export function AgentProfiles({ agents }: { agents: AgentRow[] }) {
  const [editing, setEditing] = useState<AgentRow | null>(null);

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Agent</TableHead>
            <TableHead>Languages</TableHead>
            <TableHead>Strong countries</TableHead>
            <TableHead>Working hours</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-0" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {agents.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-gray-500">
                No active sales agents or managers.
              </TableCell>
            </TableRow>
          )}
          {agents.map((a) => {
            const p = a.profile;
            const offNow = a.timeOff.some(
              (t) => new Date(t.startsAt) <= new Date() && new Date(t.endsAt) > new Date(),
            );
            return (
              <TableRow key={a.userId}>
                <TableCell>
                  <div className="font-medium text-gray-900">{a.name}</div>
                  <div className="text-xs text-gray-500">{roleLabel(a.role)}</div>
                </TableCell>
                <TableCell className="text-sm text-gray-700">
                  {p?.languages.length ? p.languages.join(", ") : <span className="text-gray-400">—</span>}
                </TableCell>
                <TableCell className="text-sm text-gray-700">
                  {p?.strongCountries.length ? p.strongCountries.join(", ") : <span className="text-gray-400">—</span>}
                </TableCell>
                <TableCell className="text-sm text-gray-700">
                  {p ? hoursSummary(p.weeklySchedule) : <span className="text-gray-400">—</span>}
                  {p && <div className="text-xs text-gray-400">{p.timezone}</div>}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {!p && <Badge variant="outline" className="text-gray-500">No profile yet</Badge>}
                    {p?.isSeniorConsultant && <Badge>Senior consultant</Badge>}
                    {p && !p.isAvailable && <Badge variant="warning">Unavailable</Badge>}
                    {offNow && <Badge variant="warning">On leave</Badge>}
                    {p?.isSeniorConsultant && !p.telegramChatId && (
                      <Badge variant="outline" className="text-gray-500">No Telegram</Badge>
                    )}
                    {p && p.isAvailable && !offNow && !p.isSeniorConsultant && (
                      <Badge variant="success">Available</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Button variant="outline" size="sm" onClick={() => setEditing(a)}>
                    <Pencil /> {p ? "Edit" : "Set up"}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {editing && (
        <EditAgentDialog
          key={editing.userId}
          agent={agents.find((a) => a.userId === editing.userId) ?? editing}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------

function ChipInput({
  label,
  hint,
  values,
  onChange,
  suggestions = [],
  placeholder,
}: {
  label: string;
  hint?: string;
  values: string[];
  onChange: (v: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  const add = (raw: string) => {
    const parts = raw.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
    const next = [...values];
    for (const p of parts) if (!next.some((v) => v.toLowerCase() === p.toLowerCase())) next.push(p);
    onChange(next);
    setDraft("");
  };
  const unused = suggestions.filter((s) => !values.some((v) => v.toLowerCase() === s.toLowerCase()));

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-input px-2 py-1.5 focus-within:ring-1 focus-within:ring-ring">
        {values.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded bg-red-50 px-2 py-0.5 text-xs font-medium text-[#b91c1c]">
            {v}
            <button
              type="button"
              aria-label={`Remove ${v}`}
              onClick={() => onChange(values.filter((x) => x !== v))}
              className="text-[#b91c1c]/60 hover:text-[#b91c1c]"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === ",") && draft.trim()) {
              e.preventDefault();
              add(draft);
            } else if (e.key === "Backspace" && !draft && values.length) {
              onChange(values.slice(0, -1));
            }
          }}
          onBlur={() => draft.trim() && add(draft)}
          placeholder={values.length ? "" : placeholder}
          className="min-w-24 flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
        />
      </div>
      {unused.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {unused.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="rounded border border-dashed border-gray-300 px-1.5 py-0.5 text-xs text-gray-500 hover:border-gray-400 hover:text-gray-700"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

type DayRow = { on: boolean; start: string; end: string };

function toDayRows(s: WeeklySchedule | null): Record<Day, DayRow> {
  const rows = {} as Record<Day, DayRow>;
  for (const d of DAYS) {
    const slot = s?.[d]?.[0];
    rows[d] = slot
      ? { on: true, start: slot.start, end: slot.end }
      : { on: !s && d !== "sat" && d !== "sun", start: "09:00", end: "18:00" };
  }
  return rows;
}

function EditAgentDialog({ agent, onClose }: { agent: AgentRow; onClose: () => void }) {
  const p = agent.profile;
  const [languages, setLanguages] = useState(p?.languages ?? []);
  const [countries, setCountries] = useState(p?.strongCountries ?? []);
  const [specialties, setSpecialties] = useState(p?.specialties ?? []);
  const [timezone, setTimezone] = useState(p?.timezone ?? "Europe/Istanbul");
  const [days, setDays] = useState(() => toDayRows(p?.weeklySchedule ?? null));
  const [isAvailable, setAvailable] = useState(p?.isAvailable ?? true);
  const [isSenior, setSenior] = useState(p?.isSeniorConsultant ?? false);
  const [telegram, setTelegram] = useState(p?.telegramChatId ?? "");
  const [maxOpen, setMaxOpen] = useState(p?.maxOpenLeads?.toString() ?? "");
  const [saving, startSave] = useTransition();

  const zones = TIMEZONES.includes(timezone) ? TIMEZONES : [timezone, ...TIMEZONES];

  const setDay = (d: Day, patch: Partial<DayRow>) => setDays((prev) => ({ ...prev, [d]: { ...prev[d], ...patch } }));

  const save = () =>
    startSave(async () => {
      const weeklySchedule: WeeklySchedule = {};
      for (const d of DAYS) if (days[d].on) weeklySchedule[d] = [{ start: days[d].start, end: days[d].end }];
      try {
        await saveAgentProfile(agent.userId, {
          languages,
          strongCountries: countries,
          specialties,
          timezone,
          weeklySchedule,
          isAvailable,
          isSeniorConsultant: isSenior,
          telegramChatId: telegram.trim() || null,
          maxOpenLeads: maxOpen.trim() ? Number(maxOpen) : null,
        });
        toast({ title: `Saved ${agent.name}` });
        onClose();
      } catch (e) {
        toast({ variant: "destructive", title: "Couldn't save", description: errorText(e) });
      }
    });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{agent.name}</DialogTitle>
          <DialogDescription>
            {roleLabel(agent.role)} · What the qualifier needs to suggest the right inquiries to this person.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <section className="grid gap-3 sm:grid-cols-2">
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 hover:bg-gray-50">
              <Checkbox checked={isAvailable} onCheckedChange={(v) => setAvailable(v === true)} className="mt-0.5" />
              <span>
                <span className="block text-sm font-semibold text-gray-900">Available for new inquiries</span>
                <span className="block text-xs text-gray-500">Untick to stop all suggestions, e.g. during leave.</span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 hover:bg-gray-50">
              <Checkbox checked={isSenior} onCheckedChange={(v) => setSenior(v === true)} className="mt-0.5" />
              <span>
                <span className="block text-sm font-semibold text-gray-900">Senior consultant</span>
                <span className="block text-xs text-gray-500">Gets the Telegram alerts and makes the final choice.</span>
              </span>
            </label>
          </section>

          <section className="space-y-4">
            <ChipInput
              label="Languages"
              values={languages}
              onChange={setLanguages}
              suggestions={LANGUAGE_SUGGESTIONS}
              placeholder="Type a language and press Enter"
            />
            <ChipInput
              label="Strong countries or regions"
              hint="Country codes (AE, GB, SA) or regions (Gulf)."
              values={countries}
              onChange={setCountries}
              placeholder="e.g. AE, Gulf"
            />
            <ChipInput
              label="Specialties"
              values={specialties}
              onChange={setSpecialties}
              suggestions={SPECIALTY_SUGGESTIONS}
              placeholder="Type a specialty and press Enter"
            />
          </section>

          <section className="space-y-2">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <Label>Working hours</Label>
              <div className="flex items-center gap-2">
                <Label htmlFor="tz" className="text-xs font-normal text-gray-500">Timezone</Label>
                <select
                  id="tz"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
                >
                  {zones.map((z) => (
                    <option key={z} value={z}>{z.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="divide-y rounded-lg border">
              {DAYS.map((d) => (
                <div key={d} className="flex items-center gap-3 px-3 py-2">
                  <label className="flex w-32 cursor-pointer items-center gap-2 text-sm">
                    <Checkbox checked={days[d].on} onCheckedChange={(v) => setDay(d, { on: v === true })} />
                    {DAY_LABELS[d]}
                  </label>
                  {days[d].on ? (
                    <div className="flex items-center gap-2 text-sm">
                      <Input type="time" value={days[d].start} onChange={(e) => setDay(d, { start: e.target.value })} className="h-8 w-28" />
                      <span className="text-gray-400">to</span>
                      <Input type="time" value={days[d].end} onChange={(e) => setDay(d, { end: e.target.value })} className="h-8 w-28" />
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">Day off</span>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tg">Telegram chat ID</Label>
              <Input id="tg" inputMode="numeric" value={telegram} onChange={(e) => setTelegram(e.target.value)} placeholder="e.g. 123456789" />
              <p className="text-xs text-gray-500">Only needed for senior consultants. Set up in a later step.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="max">Most open leads at once</Label>
              <Input id="max" type="number" min={1} value={maxOpen} onChange={(e) => setMaxOpen(e.target.value)} placeholder="No limit" />
              <p className="text-xs text-gray-500">Above this, no new inquiries are suggested to them.</p>
            </div>
          </section>

          <TimeOffSection agent={agent} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="animate-spin" />} Save profile
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TimeOffSection({ agent }: { agent: AgentRow }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();

  const add = () =>
    start(async () => {
      try {
        await addAgentTimeOff(agent.userId, { startsAt: from, endsAt: to || from, reason: reason.trim() || null });
        setFrom("");
        setTo("");
        setReason("");
        toast({ title: "Leave added" });
      } catch (e) {
        toast({ variant: "destructive", title: "Couldn't add leave", description: errorText(e) });
      }
    });

  const remove = (id: string) =>
    start(async () => {
      try {
        await deleteAgentTimeOff(id);
        toast({ title: "Leave removed" });
      } catch (e) {
        toast({ variant: "destructive", title: "Couldn't remove leave", description: errorText(e) });
      }
    });

  return (
    <section className="space-y-2 rounded-lg bg-gray-50 p-4">
      <div className="flex items-center gap-2">
        <CalendarOff className="h-4 w-4 text-gray-500" />
        <h3 className="text-sm font-semibold text-gray-900">Leave</h3>
        <span className="text-xs text-gray-500">— never suggested on these days. Saved straight away.</span>
      </div>

      {agent.timeOff.length === 0 ? (
        <p className="text-sm text-gray-500">No leave planned.</p>
      ) : (
        <ul className="divide-y rounded-md border bg-white">
          {agent.timeOff.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
              <span>
                <span className="font-medium text-gray-900">{dateFmt(t.startsAt)} – {lastDayFmt(t.endsAt)}</span>
                {t.reason && <span className="text-gray-500"> · {t.reason}</span>}
              </span>
              <Button variant="ghost" size="icon" aria-label="Remove leave" disabled={pending} onClick={() => remove(t.id)}>
                <Trash2 className="text-gray-500" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label htmlFor="off-from" className="text-xs">First day</Label>
          <Input id="off-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 w-40 bg-white" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="off-to" className="text-xs">Last day</Label>
          <Input id="off-to" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className="h-8 w-40 bg-white" />
        </div>
        <div className="min-w-40 flex-1 space-y-1">
          <Label htmlFor="off-reason" className="text-xs">Reason (optional)</Label>
          <Input id="off-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Holiday" className="h-8 bg-white" />
        </div>
        <Button size="sm" variant="outline" disabled={!from || pending} onClick={add} className="bg-white">
          {pending ? <Loader2 className="animate-spin" /> : <Plus />} Add leave
        </Button>
      </div>
    </section>
  );
}
