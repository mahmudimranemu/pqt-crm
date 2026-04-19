import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auditLogWithUser } from "@/lib/audit";
import { generateLeadNumber } from "@/lib/ref-id";
import { withApiAuth } from "@/lib/api/auth";
import {
  parsePagination,
  paginated,
  serializeLead,
} from "@/lib/api/serialize";
import type {
  BudgetRange,
  Currency,
  LeadSource,
  LeadStage,
  PropertyType,
  SourceChannel,
} from "@prisma/client";

export const GET = withApiAuth("leads:read", async (req: NextRequest) => {
  const sp = req.nextUrl.searchParams;
  const { page, limit, skip } = parsePagination(sp);

  const where: Record<string, unknown> = {};
  const stage = sp.get("stage");
  const source = sp.get("source");
  const ownerId = sp.get("ownerId");
  const clientId = sp.get("clientId");
  if (stage) where.stage = stage as LeadStage;
  if (source) where.source = source as LeadSource;
  if (ownerId) where.ownerId = ownerId;
  if (clientId) where.clientId = clientId;

  const [rows, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.lead.count({ where }),
  ]);

  return NextResponse.json(paginated(rows.map(serializeLead), total, page, limit));
});

export const POST = withApiAuth(
  "leads:write",
  async (req: NextRequest, { auth }) => {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      throw new Error("Invalid JSON body");
    }
    if (!body.title || typeof body.title !== "string") {
      throw new Error('Field "title" is required');
    }
    if (!body.clientId || typeof body.clientId !== "string") {
      throw new Error('Field "clientId" is required');
    }

    const client = await prisma.client.findUnique({
      where: { id: body.clientId },
      select: { id: true },
    });
    if (!client) throw new Error("Client not found");

    const ownerId =
      (typeof body.ownerId === "string" && body.ownerId) || auth.createdById;

    const owner = await prisma.user.findUnique({
      where: { id: ownerId },
      select: { id: true },
    });
    if (!owner) throw new Error("Owner user not found");

    const leadNumber = await generateLeadNumber();

    const lead = await prisma.lead.create({
      data: {
        leadNumber,
        title: body.title,
        description: body.description ?? null,
        stage: (body.stage ?? "NEW_ENQUIRY") as LeadStage,
        estimatedValue:
          body.estimatedValue !== undefined && body.estimatedValue !== null
            ? body.estimatedValue
            : undefined,
        currency: (body.currency ?? "USD") as Currency,
        budgetRange: body.budgetRange
          ? (body.budgetRange as BudgetRange)
          : undefined,
        source: body.source ? (body.source as LeadSource) : undefined,
        sourceChannel: body.sourceChannel
          ? (body.sourceChannel as SourceChannel)
          : undefined,
        sourceDetail: body.sourceDetail ?? undefined,
        propertyType: body.propertyType
          ? (body.propertyType as PropertyType)
          : undefined,
        preferredLocation: body.preferredLocation ?? undefined,
        clientId: body.clientId,
        ownerId,
        tags: Array.isArray(body.tags) ? body.tags : [],
      },
    });

    await auditLogWithUser(
      auth.createdById,
      "CREATE",
      "Lead",
      lead.id,
      { via: "api", apiKeyId: auth.id },
    );

    return NextResponse.json({ data: serializeLead(lead) }, { status: 201 });
  },
);
