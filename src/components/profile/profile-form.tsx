"use client";

import {
  PROFILE_GROUPS,
  INSIGHT_FIELDS,
  type ClientProfile,
  type ProfileField,
} from "@/lib/profile/schema";

/**
 * Generic editable form rendered from PROFILE_GROUPS — the same descriptor that
 * defines the AI output and the stored shape. Conditional groups (investment /
 * citizenship) appear based on the current intent.
 */
export function ProfileForm({
  value,
  onChange,
}: {
  value: ClientProfile;
  onChange: (next: ClientProfile) => void;
}) {
  const set = (groupKey: string, fieldKey: string, fieldValue: unknown) => {
    const next = structuredClone(value) as Record<string, unknown>;
    if (groupKey === "dealBreakers") {
      next.dealBreakers = fieldValue;
    } else {
      next[groupKey] = {
        ...(next[groupKey] as object),
        [fieldKey]: fieldValue,
      };
    }
    onChange(next as unknown as ClientProfile);
  };

  const readField = (groupKey: string, fieldKey: string): unknown => {
    if (groupKey === "dealBreakers") return value.dealBreakers;
    const group = (value as Record<string, unknown>)[groupKey];
    return group ? (group as Record<string, unknown>)[fieldKey] : null;
  };

  return (
    <div className="space-y-5">
      {PROFILE_GROUPS.map((group) => {
        if (group.conditional && !group.conditional(value)) return null;
        return (
          <section key={group.key}>
            <h4 className="text-sm font-semibold text-gray-900">{group.title}</h4>
            {group.description && (
              <p className="mb-2 text-xs text-gray-500">{group.description}</p>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {group.fields.map((f) => (
                <Field
                  key={f.key}
                  field={f}
                  value={readField(group.key as string, f.key)}
                  onChange={(v) => set(group.key as string, f.key, v)}
                />
              ))}
            </div>
          </section>
        );
      })}

      {/* AI insights — editable but labelled as unverified */}
      <section>
        <h4 className="text-sm font-semibold text-gray-900">
          AI insights{" "}
          <span className="font-normal text-amber-600">— verify locally</span>
        </h4>
        <div className="mt-2 space-y-3">
          {INSIGHT_FIELDS.map((f) => (
            <div key={f.key}>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                {f.label}
              </label>
              <textarea
                className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm"
                rows={2}
                value={(value.insights[f.key] as string) ?? ""}
                onChange={(e) =>
                  onChange({
                    ...value,
                    insights: { ...value.insights, [f.key]: e.target.value || null },
                  })
                }
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Field({
  field,
  value,
  onChange,
}: {
  field: ProfileField;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const cls =
    "w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#dc2626]";
  const label = (
    <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-gray-600">
      {field.label}
      <span className="rounded bg-gray-100 px-1 text-[9px] uppercase tracking-wide text-gray-400">
        {field.source}
      </span>
    </label>
  );

  // arrays (multiselect / tags) edited as comma-separated text
  if (field.type === "multiselect" || field.type === "tags") {
    const arr = Array.isArray(value) ? (value as string[]) : [];
    return (
      <div>
        {label}
        <input
          className={cls}
          value={arr.join(", ")}
          placeholder={field.options ? field.options.join(", ") : "comma-separated"}
          onChange={(e) =>
            onChange(
              e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            )
          }
        />
      </div>
    );
  }

  if (field.type === "boolean") {
    const v = value === true ? "yes" : value === false ? "no" : "";
    return (
      <div>
        {label}
        <select
          className={cls}
          value={v}
          onChange={(e) =>
            onChange(e.target.value === "" ? null : e.target.value === "yes")
          }
        >
          <option value="">—</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
      </div>
    );
  }

  if (field.type === "select") {
    return (
      <div>
        {label}
        <select
          className={cls}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
        >
          <option value="">—</option>
          {field.options?.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div className="sm:col-span-2">
        {label}
        <textarea
          className={cls}
          rows={2}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
        />
      </div>
    );
  }

  // text / number
  return (
    <div>
      {label}
      <input
        className={cls}
        type={field.type === "number" ? "number" : "text"}
        value={value == null ? "" : String(value)}
        onChange={(e) =>
          onChange(
            field.type === "number"
              ? e.target.value === ""
                ? null
                : Number(e.target.value)
              : e.target.value || null,
          )
        }
      />
    </div>
  );
}
