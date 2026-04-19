import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auditLogWithUser } from "@/lib/audit";
import { withApiAuth } from "@/lib/api/auth";
import { serializeEnquiry } from "@/lib/api/serialize";

const UPDATABLE_FIELDS = new Set([
  "called",
  "spoken",
  "segment",
  "leadStatus",
  "priority",
  "nextCallDate",
  "snooze",
  "budget",
  "country",
  "tags",
  "assignedAgentId",
  "interestedPropertyId",
  "status",
  "message",
]);

export const GET = withApiAuth<{ id: string }>(
  "enquiries:read",
  async (_req, { params }) => {
    const enquiry = await prisma.enquiry.findUnique({ where: { id: params.id } });
    if (!enquiry) throw new Error("Enquiry not found");
    return NextResponse.json({ data: serializeEnquiry(enquiry) });
  },
);

export const PATCH = withApiAuth<{ id: string }>(
  "enquiries:write",
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

    const updated = await prisma.enquiry
      .update({ where: { id: params.id }, data })
      .catch(() => null);
    if (!updated) throw new Error("Enquiry not found");

    await auditLogWithUser(
      auth.createdById,
      "UPDATE",
      "Enquiry",
      updated.id,
      { via: "api", apiKeyId: auth.id, changes: data },
    );

    return NextResponse.json({ data: serializeEnquiry(updated) });
  },
);
