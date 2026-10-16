import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { notificationInput } from "@/lib/qualifier/schemas";
import { automationRoute, validate } from "@/lib/qualifier/route";

export const dynamic = "force-dynamic";

/**
 * POST /api/automation/notifications
 * Logs a Telegram message or email the automation sent. Idempotent on
 * dedupeKey. A successfully sent "new_inquiry" alert moves the
 * qualification from "pending" to "notified".
 */
export const POST = automationRoute(async ({ body }) => {
  const v = validate(notificationInput, body);
  if (!v.ok) return v.result;
  const input = v.data;
  const audit = { enquiryId: input.enquiryId ?? null };

  if (input.dedupeKey) {
    const existing = await prisma.qualifierNotification.findUnique({ where: { dedupeKey: input.dedupeKey } });
    if (existing) return { status: 200, body: { created: false, notification: existing }, audit: { ...audit, summary: { created: false } } };
  }

  let notification;
  try {
    notification = await prisma.qualifierNotification.create({
      data: {
        enquiryId: input.enquiryId ?? null,
        channel: input.channel,
        kind: input.kind,
        recipientUserId: input.recipientUserId ?? null,
        dedupeKey: input.dedupeKey ?? null,
        externalMessageId: input.externalMessageId ?? null,
        deliveryStatus: input.deliveryStatus,
        errorMessage: input.errorMessage ?? null,
        ...(input.sentAt ? { sentAt: new Date(input.sentAt) } : {}),
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002" && input.dedupeKey) {
      const row = await prisma.qualifierNotification.findUnique({ where: { dedupeKey: input.dedupeKey } });
      return { status: 200, body: { created: false, notification: row }, audit: { ...audit, summary: { created: false, race: true } } };
    }
    throw e;
  }

  if (input.kind === "new_inquiry" && input.deliveryStatus === "sent" && input.enquiryId) {
    await prisma.inquiryQualification.updateMany({
      where: { enquiryId: input.enquiryId, status: "pending" },
      data: { status: "notified" },
    });
  }

  return {
    status: 201,
    body: { created: true, notification },
    audit: { ...audit, summary: { created: true, channel: input.channel, kind: input.kind, delivery: input.deliveryStatus } },
  };
});
