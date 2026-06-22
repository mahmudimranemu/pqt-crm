import "server-only";

import { getPmsConfig } from "@/lib/pms-config";
import type { DisplayProperty } from "@/lib/api/external-properties";

// --- PMS external API shapes (subset we consume) ---

interface PmsListItem {
  id: string;
  pqt_code: string;
  listing_title: string;
  district_name: string | null;
  side: string | null;
  neighbourhood: string | null;
  category: string;
  status: string;
  cbi_eligible: boolean;
  suitable_for_residence: boolean;
  starting_price_usd: number | string | null;
  delivery_date: string | null;
  roi_estimate: number | string | null;
  rental_yield: number | string | null;
  cover_image_url: string | null;
  bedrooms_summary: string | null;
  unit_count: number;
}

interface PmsPage {
  items: PmsListItem[];
  next_cursor: string | null;
}

interface PmsDetail extends PmsListItem {
  district: { name?: string | null } | null;
  full_address: string | null;
  property_types: string[];
  completion_status: string | null;
  payment_plan: string | null;
  floors: number | null;
  building_age: number;
  description_short: string | null;
  description_full: string | null;
  key_features: string[];
  amenities: string[];
  distances: Array<Record<string, unknown>>;
  images: string[];
  total_units: number | null;
  developer: { name: string } | null;
  units: PmsUnit[];
  is_child: boolean;
  parent_pqt_code: string | null;
  siblings: PmsSibling[];
}

interface PmsUnit {
  type: string;
  bedrooms: number;
  bathrooms: number;
  net_sqm: number | string | null;
  gross_sqm: number | string | null;
  price_usd: number | string | null;
  available_count: number;
}

interface PmsSibling {
  pqt_code: string;
  listing_title: string;
  bedrooms: number | null;
  starting_price_usd: number | string | null;
  price_usd: number | string | null;
}

// --- helpers ---

const num = (v: unknown): number | null => {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const titleCase = (s: string | null | undefined): string =>
  (s ?? "")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

const firstBedrooms = (summary: string | null): number | null => {
  const m = summary?.match(/\d+/);
  return m ? Number(m[0]) : null;
};

function mapList(p: PmsListItem): DisplayProperty {
  return {
    id: p.pqt_code,
    slug: p.pqt_code,
    name: p.listing_title,
    reference: p.pqt_code,
    status: titleCase(p.status),
    type: titleCase(p.category),
    category: titleCase(p.category),
    developmentStatus: null,
    constructionYear: null,
    city: p.neighbourhood || p.district_name || "",
    district: p.district_name || "",
    country: "Turkey",
    price: num(p.starting_price_usd) ?? 0,
    currency: "USD",
    priceNegotiable: false,
    downPaymentPercentage: null,
    bedrooms: firstBedrooms(p.bedrooms_summary),
    bathrooms: null,
    livingRooms: null,
    roomConfiguration: p.bedrooms_summary,
    furnished: null,
    parkingType: null,
    grossArea: null,
    netArea: null,
    plotSize: null,
    totalFloors: null,
    propertyFloor: null,
    imageUrl: p.cover_image_url,
    thumbnailUrl: p.cover_image_url,
    galleryUrls: [],
    amenities: [],
    distances: [],
    citizenshipEligible: p.cbi_eligible,
    citizenshipAmount: null,
    residencePermitEligible: p.suitable_for_residence,
    roiPercentage: num(p.roi_estimate),
    rentalGuaranteePercentage: num(p.rental_yield),
    estimatedRentalIncome: null,
    titleDeedStatus: null,
    shortDescription: "",
    fullDescription: null,
    whyBuy: null,
    investmentHighlights: [],
    keyFeatures: [],
    featured: false,
    newListing: false,
    urgentSale: false,
    exclusive: false,
    videoUrl: null,
    virtualTourUrl: null,
  };
}

function mapDetail(p: PmsDetail): DisplayProperty {
  const base = mapList(p);
  const u0 = p.units?.[0];
  return {
    ...base,
    type: titleCase(p.property_types?.[0] ?? p.category),
    developmentStatus: p.completion_status ? titleCase(p.completion_status) : null,
    city: p.neighbourhood || p.district?.name || base.city,
    district: p.district?.name || base.district,
    totalFloors: p.floors ?? null,
    bedrooms: u0?.bedrooms ?? base.bedrooms,
    bathrooms: u0?.bathrooms ?? null,
    netArea: num(u0?.net_sqm),
    grossArea: num(u0?.gross_sqm),
    imageUrl: p.images?.[0] ?? null,
    thumbnailUrl: p.images?.[0] ?? null,
    galleryUrls: p.images ?? [],
    amenities: p.amenities ?? [],
    keyFeatures: p.key_features ?? [],
    distances: (p.distances ?? [])
      .map((d) => ({
        label: String(d.label ?? d.name ?? ""),
        value: num(d.value ?? d.km ?? d.distance) ?? 0,
      }))
      .filter((d) => d.label),
    shortDescription: p.description_short ?? "",
    fullDescription: p.description_full ?? null,
    developerName: p.developer?.name ?? null,
    isChild: p.is_child,
    parentCode: p.parent_pqt_code,
    siblings: (p.siblings ?? []).map((s) => ({
      code: s.pqt_code,
      title: s.listing_title,
      bedrooms: s.bedrooms ?? null,
      priceUsd: num(s.price_usd ?? s.starting_price_usd),
    })),
    units: (p.units ?? []).map((u) => ({
      type: u.type,
      bedrooms: u.bedrooms,
      bathrooms: u.bathrooms,
      netSqm: num(u.net_sqm),
      priceUsd: num(u.price_usd),
      available: u.available_count,
    })),
  };
}

// --- fetch ---

const MAX_PAGES = 10; // safety cap (10 * 50 = 500 properties)

/** Pull the published property catalog from the PMS external API. Returns []
 *  when PMS isn't configured (caller can fall back to the legacy source). */
export async function fetchPmsProperties(): Promise<DisplayProperty[] | null> {
  const cfg = await getPmsConfig();
  if (!cfg) return null;

  const out: DisplayProperty[] = [];
  let cursor: string | null = null;
  try {
    for (let i = 0; i < MAX_PAGES; i++) {
      const url = new URL(`${cfg.baseUrl}/external/properties`);
      url.searchParams.set("limit", "50");
      if (cursor) url.searchParams.set("cursor", cursor);
      const res = await fetch(url, {
        headers: { "X-API-Key": cfg.apiKey },
        next: { revalidate: 300 },
      });
      if (!res.ok) {
        console.error(`PMS properties API returned ${res.status}`);
        break;
      }
      const page = (await res.json()) as PmsPage;
      out.push(...(page.items ?? []).map(mapList));
      cursor = page.next_cursor;
      if (!cursor) break;
    }
    return out;
  } catch (error) {
    console.error("Failed to fetch PMS properties:", error);
    return out.length ? out : null;
  }
}

/** Full detail for one property by PQT code. */
export async function fetchPmsPropertyByCode(
  code: string,
): Promise<DisplayProperty | null> {
  const cfg = await getPmsConfig();
  if (!cfg) return null;
  try {
    const res = await fetch(
      `${cfg.baseUrl}/external/properties/${encodeURIComponent(code)}`,
      { headers: { "X-API-Key": cfg.apiKey }, next: { revalidate: 300 } },
    );
    if (!res.ok) return null;
    return mapDetail((await res.json()) as PmsDetail);
  } catch {
    return null;
  }
}
