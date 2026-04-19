import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auditLogWithUser } from "@/lib/audit";
import { withApiAuth } from "@/lib/api/auth";
import { serializeLead } from "@/lib/api/serialize";

const UPDATABLE_FIELDS = new Set([
  "title",
  "description",
  "stage",
  "estimatedValue",
  "currency",
  "budgetRange",
  "source",
  "sourceChannel",
  "sourceDetail",
  "propertyType",
  "preferredLocation",
  "temperature",
  "lostReason",
  "ownerId",
  "called",
  "spoken",
  "segment",
  "priority",
  "nextCallDate",
  "snooze",
  "interestedPropertyId",
  "tags",
]);

export const GET = withApiAuth<{ id: string }>(
  "leads:read",
  async (_req, { params }) => {
    const lead = await prisma.lead.findUnique({ where: { id: params.id } });
    if (!lead) throw new Error("Lead not found");
    return NextResponse.json({ data: serializeLead(lead) });
  },
);

export const PATCH = withApiAuth<{ id: string }>(
  "leads:write",
  async (req, { auth, params }) => {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") throw new Error("Invalid JSON body");

    const data: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body)) {
      if (!UPDATABLE_FIELDS.has(k)) continue;
      if (k === "nextCallDate" && typeof v === "string") {
        data[k] = new Date(v);
      } else {
        data[k] = v;
      }
    }
    if (Object.keys(data).length === 0) {
      throw new Error("No updatable fields provided");
    }

    if (typeof data.ownerId === "string") {
      const owner = await prisma.user.findUnique({
        where: { id: data.ownerId },
        select: { id: true },
      });
      if (!owner) throw new Error("Owner user not found");
    }

    const updated = await prisma.lead
      .update({ where: { id: params.id }, data })
      .catch(() => null);
    if (!updated) throw new Error("Lead not found");

    await auditLogWithUser(
      auth.createdById,
      "UPDATE",
      "Lead",
      updated.id,
      { via: "api", apiKeyId: auth.id, changes: data },
    );

    return NextResponse.json({ data: serializeLead(updated) });
  },
);
