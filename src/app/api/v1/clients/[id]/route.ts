import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auditLogWithUser } from "@/lib/audit";
import { withApiAuth } from "@/lib/api/auth";
import { serializeClient } from "@/lib/api/serialize";

const UPDATABLE_FIELDS = new Set([
  "firstName",
  "lastName",
  "email",
  "phone",
  "whatsapp",
  "nationality",
  "country",
  "city",
  "passportNumber",
  "dateOfBirth",
  "budgetMin",
  "budgetMax",
  "preferredDistricts",
  "preferredPropertyType",
  "investmentPurpose",
  "source",
  "status",
  "notes",
  "tags",
  "assignedAgentId",
]);

export const GET = withApiAuth<{ id: string }>(
  "clients:read",
  async (_req, { params }) => {
    const client = await prisma.client.findUnique({ where: { id: params.id } });
    if (!client) throw new Error("Client not found");
    return NextResponse.json({ data: serializeClient(client) });
  },
);

export const PATCH = withApiAuth<{ id: string }>(
  "clients:write",
  async (req, { auth, params }) => {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") throw new Error("Invalid JSON body");

    const data: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body)) {
      if (!UPDATABLE_FIELDS.has(k)) continue;
      if (k === "dateOfBirth" && typeof v === "string") {
        data[k] = new Date(v);
      } else {
        data[k] = v;
      }
    }
    if (Object.keys(data).length === 0) {
      throw new Error("No updatable fields provided");
    }

    if (typeof data.assignedAgentId === "string") {
      const agent = await prisma.user.findUnique({
        where: { id: data.assignedAgentId },
        select: { id: true },
      });
      if (!agent) throw new Error("Assigned agent not found");
    }

    const updated = await prisma.client
      .update({ where: { id: params.id }, data })
      .catch(() => null);
    if (!updated) throw new Error("Client not found");

    await auditLogWithUser(
      auth.createdById,
      "UPDATE",
      "Client",
      updated.id,
      { via: "api", apiKeyId: auth.id, changes: data },
    );

    return NextResponse.json({ data: serializeClient(updated) });
  },
);
