import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auditLogWithUser } from "@/lib/audit";
import { generateRefId } from "@/lib/ref-id";
import { withApiAuth } from "@/lib/api/auth";
import {
  parsePagination,
  paginated,
  serializeEnquiry,
} from "@/lib/api/serialize";
import type { EnquirySource, EnquiryStatus } from "@prisma/client";

export const GET = withApiAuth("enquiries:read", async (req: NextRequest) => {
  const sp = req.nextUrl.searchParams;
  const { page, limit, skip } = parsePagination(sp);

  const where: Record<string, unknown> = {};
  const status = sp.get("status");
  const source = sp.get("source");
  const assignedAgentId = sp.get("assignedAgentId");
  if (status) where.status = status as EnquiryStatus;
  if (source) where.source = source as EnquirySource;
  if (assignedAgentId === "null") where.assignedAgentId = null;
  else if (assignedAgentId) where.assignedAgentId = assignedAgentId;

  const [rows, total] = await Promise.all([
    prisma.enquiry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.enquiry.count({ where }),
  ]);

  return NextResponse.json(paginated(rows.map(serializeEnquiry), total, page, limit));
});

export const POST = withApiAuth(
  "enquiries:write",
  async (req: NextRequest, { auth }) => {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      throw new Error("Invalid JSON body");
    }

    const required = ["firstName", "lastName", "email", "phone"] as const;
    for (const f of required) {
      if (!body[f] || typeof body[f] !== "string") {
        throw new Error(`Field "${f}" is required`);
      }
    }

    const refId = await generateRefId();
    const assignedAgentId =
      typeof body.assignedAgentId === "string" ? body.assignedAgentId : null;

    const enquiry = await prisma.enquiry.create({
      data: {
        refId,
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phone: body.phone,
        message: body.message ?? null,
        source: (body.source ?? "WEBSITE_FORM") as EnquirySource,
        sourceUrl: body.sourceUrl ?? null,
        budget: body.budget ?? null,
        country: body.country ?? null,
        segment: body.segment ?? "Buyer",
        priority: body.priority ?? "Medium",
        nextCallDate: new Date(),
        assignedAgentId,
        interestedPropertyId: body.interestedPropertyId ?? null,
        interestedPropertyRefs: Array.isArray(body.interestedPropertyRefs)
          ? body.interestedPropertyRefs
          : [],
        tags: Array.isArray(body.tags) ? body.tags : [],
        status: assignedAgentId ? "ASSIGNED" : "NEW",
      },
    });

    await auditLogWithUser(
      auth.createdById,
      "CREATE",
      "Enquiry",
      enquiry.id,
      { via: "api", apiKeyId: auth.id },
    );

    return NextResponse.json(
      { data: serializeEnquiry(enquiry) },
      { status: 201 },
    );
  },
);
