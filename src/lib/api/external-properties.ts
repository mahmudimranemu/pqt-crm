const API_URL = "https://propertyquestturkey.com/api/properties?limit=100";

// --- Raw API types ---

interface MediaObject {
  id: number;
  url: string;
  filename: string;
  width: number;
  height: number;
  sizes?: {
    thumbnail?: {
      url: string;
      width: number;
      height: number;
    };
  };
}

interface RichTextNode {
  type: string;
  children?: RichTextNode[];
  text?: string;
}

interface RichTextContent {
  root: {
    children: RichTextNode[];
  };
}

interface ExternalProperty {
  id: number;
  property_title: string;
  property_reference: string;
  slug: string;
  property_status: string | null;
  listing_type: string | null;
  featured: boolean | null;
  urgent_sale: boolean | null;
  new_listing: boolean | null;
  exclusive: boolean | null;
  property_type: string;
  property_category: string;
  property_style: string | null;
  development_status: string | null;
  construction_year: number | null;
  country: string;
  city: { title: string; slug: string } | null;
  district: { title: string; slug: string } | null;
  price: number;
  currency: string;
  price_usd: number | null;
  price_negotiable: boolean | null;
  payment_plan_available: boolean | null;
  down_payment_percentage: number | null;
  installment_months: number | null;
  plot_size: number | null;
  gross_area: number | null;
  net_area: number | null;
  total_floors_in_building: number | null;
  property_floor: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  living_rooms: number | null;
  kitchens: number | null;
  room_configuration: string | null;
  furnished: string | null;
  parking_type: string | null;
  elevator: boolean | null;
  sea_view: boolean | null;
  mountain_view: boolean | null;
  city_view: boolean | null;
  pool_view: boolean | null;
  private_pool: boolean | null;
  shared_pool: boolean | null;
  smart_home: boolean | null;
  distance_to_sea: number | null;
  distance_to_airport: number | null;
  distance_to_city_center: number | null;
  distance_to_public_transport: number | null;
  distance_to_hospital: number | null;
  distance_to_schools: number | null;
  distance_to_shopping: number | null;
  distance_to_beach: number | null;
  title_deed_status: string | null;
  eligible_for_citizenship: boolean | null;
  citizenship_qualifying_amount: number | null;
  residence_permit_eligible: boolean | null;
  rental_guarantee: boolean | null;
  rental_guarantee_percentage: number | null;
  rental_guarantee_years: number | null;
  estimated_rental_income: number | null;
  roi_percentage: number | null;
  short_description: string;
  full_description: RichTextContent | null;
  why_buy_this_property: RichTextContent | null;
  investment_highlights: RichTextContent | null;
  key_features: { id: string; feature: string }[];
  featured_image: MediaObject | null;
  image_gallery: { id: string; image: MediaObject[] }[];
  video_url: string | null;
  virtual_tour_url: string | null;
  floor_plans: unknown[];
  _status: string;
  createdAt: string;
  updatedAt: string;
}

// --- Display types for UI ---

export interface DisplayProperty {
  id: string;
  slug: string;
  name: string;
  reference: string;
  status: string;
  type: string;
  category: string;
  developmentStatus: string | null;
  constructionYear: number | null;
  city: string;
  district: string;
  country: string;
  price: number;
  currency: string;
  priceNegotiable: boolean;
  downPaymentPercentage: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  livingRooms: number | null;
  roomConfiguration: string | null;
  furnished: string | null;
  parkingType: string | null;
  grossArea: number | null;
  netArea: number | null;
  plotSize: number | null;
  totalFloors: number | null;
  propertyFloor: number | null;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  galleryUrls: string[];
  amenities: string[];
  distances: { label: string; value: number }[];
  citizenshipEligible: boolean;
  citizenshipAmount: number | null;
  residencePermitEligible: boolean;
  roiPercentage: number | null;
  rentalGuaranteePercentage: number | null;
  estimatedRentalIncome: number | null;
  titleDeedStatus: string | null;
  shortDescription: string;
  fullDescription: string | null;
  whyBuy: string | null;
  investmentHighlights: string[];
  keyFeatures: string[];
  featured: boolean;
  newListing: boolean;
  urgentSale: boolean;
  exclusive: boolean;
  videoUrl: string | null;
  virtualTourUrl: string | null;
}

// --- Helpers ---

function extractText(content: RichTextContent | null): string | null {
  if (!content?.root?.children) return null;
  const texts: string[] = [];
  function walk(nodes: RichTextNode[]) {
    for (const node of nodes) {
      if (node.text) texts.push(node.text);
      if (node.children) walk(node.children);
    }
  }
  walk(content.root.children);
  return texts.join("\n\n") || null;
}

function extractParagraphs(content: RichTextContent | null): string[] {
  if (!content?.root?.children) return [];
  return content.root.children
    .map((para) => {
      const texts: string[] = [];
      function walk(nodes: RichTextNode[]) {
        for (const node of nodes) {
          if (node.text) texts.push(node.text);
          if (node.children) walk(node.children);
        }
      }
      if (para.children) walk(para.children);
      return texts.join("");
    })
    .filter((t) => t.trim().length > 0);
}

function mapToDisplayProperty(p: ExternalProperty): DisplayProperty {
  // Collect boolean amenities
  const amenities: string[] = [];
  if (p.sea_view) amenities.push("Sea View");
  if (p.mountain_view) amenities.push("Mountain View");
  if (p.city_view) amenities.push("City View");
  if (p.pool_view) amenities.push("Pool View");
  if (p.private_pool) amenities.push("Private Pool");
  if (p.shared_pool) amenities.push("Shared Pool");
  if (p.smart_home) amenities.push("Smart Home");
  if (p.elevator) amenities.push("Elevator");

  // Collect distances
  const distances: { label: string; value: number }[] = [];
  if (p.distance_to_sea != null)
    distances.push({ label: "Sea", value: p.distance_to_sea });
  if (p.distance_to_beach != null)
    distances.push({ label: "Beach", value: p.distance_to_beach });
  if (p.distance_to_airport != null)
    distances.push({ label: "Airport", value: p.distance_to_airport });
  if (p.distance_to_city_center != null)
    distances.push({ label: "City Center", value: p.distance_to_city_center });
  if (p.distance_to_public_transport != null)
    distances.push({
      label: "Transport",
      value: p.distance_to_public_transport,
    });
  if (p.distance_to_hospital != null)
    distances.push({ label: "Hospital", value: p.distance_to_hospital });
  if (p.distance_to_schools != null)
    distances.push({ label: "Schools", value: p.distance_to_schools });
  if (p.distance_to_shopping != null)
    distances.push({ label: "Shopping", value: p.distance_to_shopping });

  // Extract gallery image URLs
  const galleryUrls: string[] = [];
  for (const group of p.image_gallery || []) {
    for (const img of group.image || []) {
      if (img.url) galleryUrls.push(img.url);
    }
  }

  // Parse key_features (may be semicolon or newline separated in a single string)
  const keyFeatures: string[] = [];
  for (const kf of p.key_features || []) {
    const parts = kf.feature
      .split(/\s{2,}/)
      .map((s) => s.trim())
      .filter(Boolean);
    keyFeatures.push(...parts);
  }

  return {
    id: p.id.toString(),
    slug: p.slug,
    name: p.property_title,
    reference: p.property_reference,
    status: p.property_status || "For Sale",
    type: p.property_type,
    category: p.property_category,
    developmentStatus: p.development_status,
    constructionYear: p.construction_year,
    city: p.city?.title || "Istanbul",
    district: p.district?.title || "",
    country: p.country || "Turkey",
    price: p.price_usd || p.price,
    currency: p.currency || "USD",
    priceNegotiable: !!p.price_negotiable,
    downPaymentPercentage: p.down_payment_percentage,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    livingRooms: p.living_rooms,
    roomConfiguration: p.room_configuration,
    furnished: p.furnished,
    parkingType: p.parking_type,
    grossArea: p.gross_area,
    netArea: p.net_area,
    plotSize: p.plot_size,
    totalFloors: p.total_floors_in_building,
    propertyFloor: p.property_floor,
    imageUrl: p.featured_image?.url || null,
    thumbnailUrl:
      p.featured_image?.sizes?.thumbnail?.url || p.featured_image?.url || null,
    galleryUrls,
    amenities,
    distances,
    citizenshipEligible: !!p.eligible_for_citizenship,
    citizenshipAmount: p.citizenship_qualifying_amount,
    residencePermitEligible: !!p.residence_permit_eligible,
    roiPercentage: p.roi_percentage,
    rentalGuaranteePercentage: p.rental_guarantee_percentage,
    estimatedRentalIncome: p.estimated_rental_income,
    titleDeedStatus: p.title_deed_status,
    shortDescription: p.short_description || "",
    fullDescription: extractText(p.full_description),
    whyBuy: extractText(p.why_buy_this_property),
    investmentHighlights: extractParagraphs(p.investment_highlights),
    keyFeatures,
    featured: !!p.featured,
    newListing: !!p.new_listing,
    urgentSale: !!p.urgent_sale,
    exclusive: !!p.exclusive,
    videoUrl: p.video_url,
    virtualTourUrl: p.virtual_tour_url,
  };
}

// --- Fetch functions ---

export async function fetchProperties(): Promise<DisplayProperty[]> {
  try {
    const res = await fetch(API_URL, {
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      console.error(`External properties API returned ${res.status}`);
      return [];
    }

    const data = await res.json();
    const docs: ExternalProperty[] = data.docs || [];

    return docs
      .filter((p) => p._status === "published")
      .map(mapToDisplayProperty);
  } catch (error) {
    console.error("Failed to fetch external properties:", error);
    return [];
  }
}

export async function fetchPropertyBySlug(
  slugOrId: string,
): Promise<DisplayProperty | null> {
  const properties = await fetchProperties();
  return (
    properties.find((p) => p.slug === slugOrId || p.id === slugOrId) || null
  );
}
