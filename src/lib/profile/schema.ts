/**
 * Client Profile — single source of truth.
 *
 * One schema drives three things: the AI's JSON output contract (see
 * CLIENT_PROFILE_SYSTEM_PROMPT), the editable preview/intake form, and the JSON
 * stored on `Client.aiProfile`. Keep the `ClientProfile` shape and the
 * `PROFILE_GROUPS` descriptor in lockstep.
 */

export type ProfileFieldType =
  | "text"
  | "textarea"
  | "number"
  | "boolean"
  | "select"
  | "multiselect"
  | "tags";

/** Where a field's value usually comes from — shown as a small hint in the UI. */
export type ProfileSource = "crm" | "ai" | "form";

export type ProfileField = {
  /** Property name within its group object. */
  key: string;
  label: string;
  type: ProfileFieldType;
  source: ProfileSource;
  /** For select / multiselect. */
  options?: readonly string[];
  placeholder?: string;
};

export type ProfileGroup = {
  key: keyof ClientProfile;
  title: string;
  description?: string;
  /** Only render/expect this group when the predicate passes (intent-based). */
  conditional?: (p: ClientProfile) => boolean;
  fields: readonly ProfileField[];
};

/* ------------------------------------------------------------------ options */

export const CONTACT_CHANNELS = ["Email", "WhatsApp", "Phone"] as const;
export const PAYMENT_METHODS = ["Cash", "Installments", "Mortgage"] as const;
export const PRIMARY_GOALS = [
  "Relocation / living",
  "Holiday home",
  "Rental income",
  "Capital appreciation",
  "Citizenship (CBI)",
] as const;
export const URGENCY = [
  "Buying now",
  "Within 3 months",
  "Within 6–12 months",
  "Just exploring",
] as const;
export const PROPERTY_TYPES = [
  "Apartment",
  "Villa",
  "Penthouse",
  "Commercial",
  "Land",
] as const;
export const READINESS = ["Ready", "Off-plan", "Either"] as const;
export const PROXIMITY = [
  "Beach",
  "City centre",
  "Airport",
  "Public transport",
  "Hospitals",
  "Schools",
  "Mosque",
] as const;
export const RENTAL_STRATEGY = [
  "Short-term (Airbnb)",
  "Long-term",
  "Either",
] as const;
export const RISK_APPETITE = ["Low", "Medium", "High"] as const;
export const SCHOOL_PREFERENCE = ["International", "Local", "No preference"] as const;

/* ------------------------------------------------------------------- shape */

export type ClientProfile = {
  identity: {
    name: string | null;
    preferredLanguage: string | null;
    contactChannel: string | null;
    countryOfResidence: string | null;
    nationality: string | null;
  };
  budget: {
    min: number | null;
    max: number | null;
    currency: string | null;
    paymentMethod: string | null;
    financingNeeded: boolean | null;
    feesInclusive: boolean | null;
  };
  intent: {
    primaryGoals: string[];
    urgency: string | null;
  };
  requirements: {
    propertyTypes: string[];
    readiness: string | null;
    bedrooms: string | null;
    bathrooms: string | null;
    sizeSqm: string | null;
    mustHaves: string[];
    niceToHaves: string[];
  };
  location: {
    regions: string[];
    districts: string[];
    proximity: string[];
  };
  family: {
    familySize: string | null;
    children: string | null;
    relocating: boolean | null;
    schoolPreference: string | null;
    languageOfInstruction: string | null;
    accessibilityNeeds: string | null;
  };
  /** Conditional — present only when intent includes investment/appreciation/rental. */
  investment: {
    targetYieldPct: string | null;
    expectedAppreciation: string | null;
    holdPeriod: string | null;
    rentalStrategy: string | null;
    riskAppetite: string | null;
  } | null;
  /** Conditional — present only when intent includes citizenship. */
  citizenship: {
    wantsCitizenship: boolean | null;
    familyMembers: string | null;
    targetTimeline: string | null;
    sourceOfFundsReady: boolean | null;
  } | null;
  dealBreakers: string[];
  signals: {
    leadSource: string | null;
    viewedProperties: string[];
    pastInteractions: string | null;
    notesSummary: string | null;
  };
  /** AI-enriched insight — must be presented as "verify locally", not fact. */
  insights: {
    neighbourhood: string | null;
    schools: string | null;
    investmentOutlook: string | null;
  };
  meta?: {
    model?: string;
    generatedAt?: string;
    sourceLeadId?: string;
    aiNotes?: string;
  };
};

/* ------------------------------------------------------- intent predicates */

export function isInvestmentIntent(p: ClientProfile): boolean {
  const g = p.intent?.primaryGoals ?? [];
  return g.some((x) =>
    /rental income|capital appreciation|investment/i.test(x),
  );
}

export function isCitizenshipIntent(p: ClientProfile): boolean {
  const g = p.intent?.primaryGoals ?? [];
  return g.some((x) => /citizen|cbi/i.test(x));
}

/* ------------------------------------------------------- group descriptors */

export const PROFILE_GROUPS: readonly ProfileGroup[] = [
  {
    key: "identity",
    title: "Client identity & eligibility",
    description: "Nationality drives CBI eligibility and offer language.",
    fields: [
      { key: "name", label: "Name", type: "text", source: "crm" },
      { key: "preferredLanguage", label: "Preferred language", type: "text", source: "form" },
      { key: "contactChannel", label: "Contact channel", type: "select", source: "crm", options: CONTACT_CHANNELS },
      { key: "countryOfResidence", label: "Country of residence", type: "text", source: "crm" },
      { key: "nationality", label: "Nationality", type: "text", source: "crm" },
    ],
  },
  {
    key: "budget",
    title: "Budget & payment",
    fields: [
      { key: "min", label: "Budget min", type: "number", source: "crm" },
      { key: "max", label: "Budget max", type: "number", source: "crm" },
      { key: "currency", label: "Currency", type: "text", source: "crm" },
      { key: "paymentMethod", label: "Payment method", type: "select", source: "form", options: PAYMENT_METHODS },
      { key: "financingNeeded", label: "Financing needed?", type: "boolean", source: "form" },
      { key: "feesInclusive", label: "Budget incl. fees & taxes?", type: "boolean", source: "form" },
    ],
  },
  {
    key: "intent",
    title: "Buying intent",
    description: "The master field — also drives which extra sections apply.",
    fields: [
      { key: "primaryGoals", label: "Primary goal(s)", type: "multiselect", source: "ai", options: PRIMARY_GOALS },
      { key: "urgency", label: "Urgency / timeline", type: "select", source: "ai", options: URGENCY },
    ],
  },
  {
    key: "requirements",
    title: "Property requirements",
    fields: [
      { key: "propertyTypes", label: "Type(s)", type: "multiselect", source: "crm", options: PROPERTY_TYPES },
      { key: "readiness", label: "Ready vs off-plan", type: "select", source: "form", options: READINESS },
      { key: "bedrooms", label: "Bedrooms", type: "text", source: "ai" },
      { key: "bathrooms", label: "Bathrooms", type: "text", source: "form" },
      { key: "sizeSqm", label: "Size (m²)", type: "text", source: "form" },
      { key: "mustHaves", label: "Must-haves", type: "tags", source: "ai" },
      { key: "niceToHaves", label: "Nice-to-haves", type: "tags", source: "ai" },
    ],
  },
  {
    key: "location",
    title: "Location & proximity",
    fields: [
      { key: "regions", label: "Cities / regions", type: "tags", source: "crm" },
      { key: "districts", label: "Districts", type: "tags", source: "crm" },
      { key: "proximity", label: "Wants to be near", type: "multiselect", source: "ai", options: PROXIMITY },
    ],
  },
  {
    key: "family",
    title: "Family & lifestyle context",
    description: "Drives the schools / neighbourhood enrichment.",
    fields: [
      { key: "familySize", label: "Family size", type: "text", source: "form" },
      { key: "children", label: "Children + ages", type: "text", source: "form" },
      { key: "relocating", label: "Relocating?", type: "boolean", source: "ai" },
      { key: "schoolPreference", label: "School preference", type: "select", source: "form", options: SCHOOL_PREFERENCE },
      { key: "languageOfInstruction", label: "Language of instruction", type: "text", source: "form" },
      { key: "accessibilityNeeds", label: "Accessibility needs", type: "text", source: "form" },
    ],
  },
  {
    key: "investment",
    title: "Investment criteria",
    description: "Shown for investment / rental / appreciation intent.",
    conditional: isInvestmentIntent,
    fields: [
      { key: "targetYieldPct", label: "Target rental yield %", type: "text", source: "form" },
      { key: "expectedAppreciation", label: "Expected appreciation", type: "text", source: "form" },
      { key: "holdPeriod", label: "Hold period", type: "text", source: "form" },
      { key: "rentalStrategy", label: "Rental strategy", type: "select", source: "form", options: RENTAL_STRATEGY },
      { key: "riskAppetite", label: "Risk appetite", type: "select", source: "form", options: RISK_APPETITE },
    ],
  },
  {
    key: "citizenship",
    title: "Citizenship (CBI) criteria",
    description: "Shown for citizenship intent. CBI minimum is US$400k with a 3-year hold.",
    conditional: isCitizenshipIntent,
    fields: [
      { key: "wantsCitizenship", label: "Wants citizenship?", type: "boolean", source: "form" },
      { key: "familyMembers", label: "Family members to include", type: "text", source: "form" },
      { key: "targetTimeline", label: "Target timeline", type: "text", source: "form" },
      { key: "sourceOfFundsReady", label: "Source-of-funds ready?", type: "boolean", source: "form" },
    ],
  },
  {
    key: "dealBreakers",
    title: "Deal-breakers",
    description: "Hard noes — prevents embarrassing mismatches.",
    fields: [
      { key: "self", label: "Deal-breakers", type: "tags", source: "ai" },
    ],
  },
  {
    key: "signals",
    title: "CRM & behavioural signals",
    fields: [
      { key: "leadSource", label: "Lead source", type: "text", source: "crm" },
      { key: "viewedProperties", label: "Properties viewed / liked", type: "tags", source: "crm" },
      { key: "pastInteractions", label: "Past interactions", type: "textarea", source: "crm" },
      { key: "notesSummary", label: "Notes summary", type: "textarea", source: "ai" },
    ],
  },
] as const;

/** Groups that are always present (not intent-gated) plus the insight block. */
export const INSIGHT_FIELDS: readonly { key: keyof ClientProfile["insights"]; label: string }[] = [
  { key: "neighbourhood", label: "Neighbourhood character" },
  { key: "schools", label: "Nearby schools" },
  { key: "investmentOutlook", label: "Area investment outlook" },
];

/* --------------------------------------------------------------- validation */

/**
 * Minimum needed to generate a usable profile: intent + budget + ≥1 location +
 * property type. Returns the list of missing requirement labels ([] = OK).
 */
export function validateMinimum(p: ClientProfile): string[] {
  const missing: string[] = [];
  if (!p.intent?.primaryGoals?.length) missing.push("buying intent");
  if (p.budget?.min == null && p.budget?.max == null) missing.push("budget");
  const hasLocation =
    (p.location?.regions?.length ?? 0) > 0 ||
    (p.location?.districts?.length ?? 0) > 0;
  if (!hasLocation) missing.push("at least one location");
  if (!p.requirements?.propertyTypes?.length) missing.push("property type");
  return missing;
}

/**
 * Coerce any stored/partial profile object into a complete, safe ClientProfile
 * (every group present) so the view and form never crash on missing nesting.
 */
export function normalizeProfile(raw: unknown): ClientProfile {
  const base = emptyProfile();
  if (!raw || typeof raw !== "object") return base;
  const p = raw as Record<string, unknown>;
  const grp = (k: string) => (p[k] && typeof p[k] === "object" ? (p[k] as Record<string, unknown>) : {});
  const obj = <T extends object>(a: T, k: string): T => ({ ...a, ...grp(k) }) as T;
  const arr = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  const intentGrp = grp("intent");
  const reqGrp = grp("requirements");
  const locGrp = grp("location");
  const sigGrp = grp("signals");
  return {
    identity: obj(base.identity, "identity"),
    budget: obj(base.budget, "budget"),
    intent: { ...obj(base.intent, "intent"), primaryGoals: arr(intentGrp.primaryGoals) },
    requirements: {
      ...obj(base.requirements, "requirements"),
      propertyTypes: arr(reqGrp.propertyTypes),
      mustHaves: arr(reqGrp.mustHaves),
      niceToHaves: arr(reqGrp.niceToHaves),
    },
    location: {
      ...obj(base.location, "location"),
      regions: arr(locGrp.regions),
      districts: arr(locGrp.districts),
      proximity: arr(locGrp.proximity),
    },
    family: obj(base.family, "family"),
    investment: p.investment
      ? ({ ...(base.investment ?? {}), ...grp("investment") } as ClientProfile["investment"])
      : null,
    citizenship: p.citizenship
      ? ({ ...(base.citizenship ?? {}), ...grp("citizenship") } as ClientProfile["citizenship"])
      : null,
    dealBreakers: arr(p.dealBreakers),
    signals: { ...obj(base.signals, "signals"), viewedProperties: arr(sigGrp.viewedProperties) },
    insights: obj(base.insights, "insights"),
    meta: p.meta && typeof p.meta === "object" ? (p.meta as ClientProfile["meta"]) : undefined,
  };
}

/** An empty profile skeleton (every field null/empty) for safe rendering. */
export function emptyProfile(): ClientProfile {
  return {
    identity: { name: null, preferredLanguage: null, contactChannel: null, countryOfResidence: null, nationality: null },
    budget: { min: null, max: null, currency: null, paymentMethod: null, financingNeeded: null, feesInclusive: null },
    intent: { primaryGoals: [], urgency: null },
    requirements: { propertyTypes: [], readiness: null, bedrooms: null, bathrooms: null, sizeSqm: null, mustHaves: [], niceToHaves: [] },
    location: { regions: [], districts: [], proximity: [] },
    family: { familySize: null, children: null, relocating: null, schoolPreference: null, languageOfInstruction: null, accessibilityNeeds: null },
    investment: null,
    citizenship: null,
    dealBreakers: [],
    signals: { leadSource: null, viewedProperties: [], pastInteractions: null, notesSummary: null },
    insights: { neighbourhood: null, schools: null, investmentOutlook: null },
  };
}
