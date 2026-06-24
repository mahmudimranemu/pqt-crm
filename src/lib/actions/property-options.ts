"use server";

import { auth, type ExtendedSession } from "@/lib/auth";

/** A property choice for the Booking / Sale "Select Property" dropdowns.
 *  `ref` is the PMS property code — stored on the booking/sale as propertyRef. */
export interface PropertyOption {
  ref: string;
  name: string;
  pqtNumber: string;
  district: string | null;
  priceFrom: number | null;
}

/** Active properties sourced from the PMS feed (same source as the Properties
 *  page + the lead/enquiry pickers). Falls back to the legacy website catalog
 *  when PMS isn't configured — see fetchProperties. */
export async function getPropertyOptions(): Promise<PropertyOption[]> {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const { fetchProperties } = await import("@/lib/api/external-properties");
  const props = await fetchProperties();
  return props.map((p) => ({
    ref: p.reference || p.id,
    name: p.name,
    pqtNumber: p.reference || p.id,
    district: p.district || null,
    priceFrom: typeof p.price === "number" ? p.price : null,
  }));
}
