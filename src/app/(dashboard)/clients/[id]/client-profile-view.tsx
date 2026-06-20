import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ShieldAlert } from "lucide-react";
import {
  PROFILE_GROUPS,
  INSIGHT_FIELDS,
  type ClientProfile,
} from "@/lib/profile/schema";

const NA = <span className="text-gray-400">Not captured</span>;

function display(value: unknown): React.ReactNode {
  if (value == null || value === "") return NA;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    if (value.length === 0) return NA;
    return (
      <span className="flex flex-wrap gap-1">
        {value.map((v, i) => (
          <Badge key={i} variant="secondary" className="font-normal">
            {String(v)}
          </Badge>
        ))}
      </span>
    );
  }
  return String(value);
}

/** Read-only render of a saved Client Profile, grouped by the schema sections. */
export function ClientProfileView({
  profile,
  generatedAt,
}: {
  profile: ClientProfile;
  generatedAt?: string | null;
}) {
  const get = (groupKey: string, fieldKey: string): unknown => {
    if (groupKey === "dealBreakers") return profile.dealBreakers;
    const g = (profile as Record<string, unknown>)[groupKey];
    return g ? (g as Record<string, unknown>)[fieldKey] : null;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Sparkles className="h-3.5 w-3.5 text-[#dc2626]" />
        AI-generated profile
        {generatedAt && (
          <span>
            · {new Date(generatedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
          </span>
        )}
        <span>· verify locally before acting</span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {PROFILE_GROUPS.map((group) => {
          if (group.conditional && !group.conditional(profile)) return null;
          return (
            <Card key={group.key}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{group.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 text-sm">
                {group.fields.map((f) => (
                  <div key={f.key} className="flex gap-2">
                    <span className="w-40 shrink-0 text-gray-500">{f.label}</span>
                    <span className="min-w-0 flex-1">{display(get(group.key as string, f.key))}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* AI insights */}
      <Card className="border-amber-200 bg-amber-50/40">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ShieldAlert className="h-4 w-4 text-amber-600" />
            AI insights — verify locally
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {INSIGHT_FIELDS.map((f) => (
            <div key={f.key}>
              <p className="text-xs font-medium text-gray-600">{f.label}</p>
              <p className="text-gray-800">{display(profile.insights[f.key])}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
