import type { Client, Enquiry, Lead } from "@prisma/client";

export function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") || "25", 10) || 25),
  );
  return { page, limit, skip: (page - 1) * limit };
}

export function paginated<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
) {
  return {
    data,
    pagination: {
      total,
      page,
      limit,
      pages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

export function serializeEnquiry(e: Enquiry) {
  return {
    id: e.id,
    refId: e.refId,
    firstName: e.firstName,
    lastName: e.lastName,
    email: e.email,
    phone: e.phone,
    message: e.message,
    source: e.source,
    sourceUrl: e.sourceUrl,
    status: e.status,
    assignedAgentId: e.assignedAgentId,
    convertedClientId: e.convertedClientId,
    budget: e.budget,
    country: e.country,
    tags: e.tags,
    called: e.called,
    spoken: e.spoken,
    segment: e.segment,
    leadStatus: e.leadStatus,
    priority: e.priority,
    nextCallDate: e.nextCallDate?.toISOString() ?? null,
    snooze: e.snooze,
    interestedPropertyId: e.interestedPropertyId,
    interestedPropertyRefs: e.interestedPropertyRefs,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

export function serializeClient(c: Client) {
  return {
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
    email: c.email,
    phone: c.phone,
    whatsapp: c.whatsapp,
    nationality: c.nationality,
    country: c.country,
    city: c.city,
    passportNumber: c.passportNumber,
    dateOfBirth: c.dateOfBirth?.toISOString() ?? null,
    budgetMin: c.budgetMin.toString(),
    budgetMax: c.budgetMax.toString(),
    preferredDistricts: c.preferredDistricts,
    preferredPropertyType: c.preferredPropertyType,
    investmentPurpose: c.investmentPurpose,
    source: c.source,
    status: c.status,
    notes: c.notes,
    tags: c.tags,
    assignedAgentId: c.assignedAgentId,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

export function serializeLead(l: Lead) {
  return {
    id: l.id,
    refId: l.refId,
    leadNumber: l.leadNumber,
    title: l.title,
    description: l.description,
    stage: l.stage,
    estimatedValue: l.estimatedValue ? l.estimatedValue.toString() : null,
    currency: l.currency,
    budgetRange: l.budgetRange,
    source: l.source,
    sourceChannel: l.sourceChannel,
    sourceDetail: l.sourceDetail,
    propertyType: l.propertyType,
    preferredLocation: l.preferredLocation,
    score: l.score,
    temperature: l.temperature,
    slaDeadline: l.slaDeadline?.toISOString() ?? null,
    lostReason: l.lostReason,
    convertedDealId: l.convertedDealId,
    clientId: l.clientId,
    ownerId: l.ownerId,
    tags: l.tags,
    called: l.called,
    spoken: l.spoken,
    segment: l.segment,
    priority: l.priority,
    nextCallDate: l.nextCallDate?.toISOString() ?? null,
    snooze: l.snooze,
    interestedPropertyId: l.interestedPropertyId,
    interestedPropertyRefs: l.interestedPropertyRefs,
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
  };
}
