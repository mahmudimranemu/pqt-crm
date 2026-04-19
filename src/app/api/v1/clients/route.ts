import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auditLogWithUser } from "@/lib/audit";
import { withApiAuth } from "@/lib/api/auth";
import {
  parsePagination,
  paginated,
  serializeClient,
} from "@/lib/api/serialize";
import type {
  ClientStatus,
  District,
  InvestmentPurpose,
  LeadSource,
  PropertyType,
} from "@prisma/client";

export const GET = withApiAuth("clients:read", async (req: NextRequest) => {
  const sp = req.nextUrl.searchParams;
  const { page, limit, skip } = parsePagination(sp);

  const where: Record<string, unknown> = {};
  const status = sp.get("status");
  const source = sp.get("source");
  const assignedAgentId = sp.get("assignedAgentId");
  const email = sp.get("email");
  if (status) where.status = status as ClientStatus;
  if (source) where.source = source as LeadSource;
  if (assignedAgentId === "null") where.assignedAgentId = null;
  else if (assignedAgentId) where.assignedAgentId = assignedAgentId;
  if (email) where.email = email;

  const [rows, total] = await Promise.all([
    prisma.client.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.client.count({ where }),
  ]);

  return NextResponse.json(paginated(rows.map(serializeClient), total, page, limit));
});

export const POST = withApiAuth(
  "clients:write",
  async (req: NextRequest, { auth }) => {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      throw new Error("Invalid JSON body");
    }

    const required = [
      "firstName",
      "lastName",
      "email",
      "phone",
      "nationality",
      "country",
    ] as const;
    for (const f of required) {
      if (!body[f] || typeof body[f] !== "string") {
        throw new Error(`Field "${f}" is required`);
      }
    }

    const budgetMin = toNumber(body.budgetMin, "budgetMin", 0);
    const budgetMax = toNumber(body.budgetMax, "budgetMax", 0);

    const assignedAgentId =
      typeof body.assignedAgentId === "string"
        ? body.assignedAgentId
        : auth.createdById;

    const client = await prisma.client.create({
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phone: body.phone,
        whatsapp: body.whatsapp ?? null,
        nationality: body.nationality,
        country: body.country,
        city: body.city ?? null,
        passportNumber: body.passportNumber ?? null,
        dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : null,
        budgetMin,
        budgetMax,
        preferredDistricts: Array.isArray(body.preferredDistricts)
          ? (body.preferredDistricts as District[])
          : [],
        preferredPropertyType: body.preferredPropertyType
          ? (body.preferredPropertyType as PropertyType)
          : null,
        investmentPurpose: (body.investmentPurpose ?? "RESIDENTIAL") as InvestmentPurpose,
        source: (body.source ?? "WEBSITE") as LeadSource,
        status: (body.status ?? "NEW_LEAD") as ClientStatus,
        notes: body.notes ?? null,
        tags: Array.isArray(body.tags) ? body.tags : [],
        assignedAgentId,
      },
    });

    await auditLogWithUser(
      auth.createdById,
      "CREATE",
      "Client",
      client.id,
      { via: "api", apiKeyId: auth.id },
    );

    return NextResponse.json({ data: serializeClient(client) }, { status: 201 });
  },
);

function toNumber(v: unknown, name: string, fallback: number): number {
  if (v === undefined || v === null || v === "") return fallback;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  if (Number.isNaN(n)) throw new Error(`Field "${name}" must be a number`);
  return n;
}
