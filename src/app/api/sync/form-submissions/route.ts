import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { notifySuperAdmins } from "@/lib/notifications";

/**
 * Sync form submissions from Payload CMS (propertyquestturkey.com).
 * Fetches recent submissions and creates CRM enquiries for any not yet synced.
 *
 * Authentication: Requires WEBSITE_WEBHOOK_SECRET as Bearer token or ?secret= param.
 * Can also be called from the CRM dashboard (with session auth via server action).
 */

const PAYLOAD_URL = process.env.PAYLOAD_CMS_URL || "https://propertyquestturkey.com";
const PAYLOAD_API_KEY = process.env.PAYLOAD_CMS_API_KEY || "";
const WEBHOOK_SECRET = process.env.WEBSITE_WEBHOOK_SECRET;

interface PayloadFormSubmission {
  id: number;
  form: { id: number; title: string } | number;
  submissionData: { field: string; value: string }[];
  createdAt: string;
  updatedAt: string;
}

interface PayloadResponse {
  docs: PayloadFormSubmission[];
  totalDocs: number;
  hasNextPage: boolean;
}

function getFieldValue(
  fields: { field: string; value: string }[],
  ...names: string[]
): string {
  for (const name of names) {
    const field = fields.find(
      (f) => f.field.toLowerCase() === name.toLowerCase(),
    );
    if (field?.value) return field.value;
  }
  return "";
}

function splitFullName(fullName: string) {
  const trimmed = fullName.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

async function loginToPayload(): Promise<string | null> {
  // If API key is set, use it directly
  if (PAYLOAD_API_KEY) return PAYLOAD_API_KEY;
  return null;
}

async function fetchSubmissions(
  token: string | null,
  limit: number = 50,
  page: number = 1,
): Promise<PayloadResponse | null> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `users API-Key ${token}`;
  }

  const url = `${PAYLOAD_URL}/api/form-submissions?limit=${limit}&page=${page}&sort=-createdAt&depth=1`;

  const res = await fetch(url, { headers, cache: "no-store" });

  if (!res.ok) {
    console.error(
      `[SYNC] Failed to fetch submissions: ${res.status} ${res.statusText}`,
    );
    return null;
  }

  return res.json();
}

function extractEnquiryData(submission: PayloadFormSubmission) {
  const formId =
    typeof submission.form === "object" ? submission.form.id : submission.form;
  const formTitle =
    typeof submission.form === "object"
      ? submission.form.title
      : `Form #${formId}`;
  const fields = submission.submissionData || [];

  let firstName = "";
  let lastName = "";
  let email = "";
  let phone = "";
  let message = "";
  let sourceUrl = "";

  switch (formId) {
    case 1: {
      // Contact Form: full-name, email, phone, message
      const fullName = getFieldValue(fields, "full-name", "fullname", "name");
      const split = splitFullName(fullName);
      firstName = split.firstName;
      lastName = split.lastName;
      email = getFieldValue(fields, "email");
      phone = getFieldValue(fields, "phone");
      message = getFieldValue(fields, "message");
      break;
    }
    case 2: {
      // Enquiry Form: firstname, surname, email, phone, message, pageURL
      firstName = getFieldValue(fields, "firstname", "first-name", "name");
      lastName = getFieldValue(fields, "surname", "last-name", "lastname");
      email = getFieldValue(fields, "email");
      phone = getFieldValue(fields, "phone");
      message = getFieldValue(fields, "message");
      sourceUrl = getFieldValue(fields, "pageURL", "pageurl", "page-url");
      break;
    }
    case 3: {
      // Home Contact: name, surname, email, phone
      firstName = getFieldValue(fields, "name", "firstname", "first-name");
      lastName = getFieldValue(fields, "surname", "last-name", "lastname");
      email = getFieldValue(fields, "email");
      phone = getFieldValue(fields, "phone");
      break;
    }
    default: {
      firstName = getFieldValue(
        fields,
        "firstname",
        "first-name",
        "name",
        "full-name",
      );
      lastName = getFieldValue(fields, "surname", "last-name", "lastname");
      email = getFieldValue(fields, "email");
      phone = getFieldValue(fields, "phone");
      message = getFieldValue(fields, "message");
      sourceUrl = getFieldValue(fields, "pageURL", "pageurl");

      if (!lastName && firstName.includes(" ")) {
        const split = splitFullName(firstName);
        firstName = split.firstName;
        lastName = split.lastName;
      }
      break;
    }
  }

  return {
    formId,
    formTitle,
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: email.toLowerCase().trim(),
    phone: phone.trim(),
    message: message.trim(),
    sourceUrl: sourceUrl.trim(),
  };
}

export async function POST(request: NextRequest) {
  // Verify authorization
  if (WEBHOOK_SECRET) {
    const authHeader = request.headers.get("authorization");
    const secretParam = request.nextUrl.searchParams.get("secret");
    const providedSecret =
      authHeader?.replace("Bearer ", "") || secretParam || "";

    if (providedSecret !== WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const token = await loginToPayload();

    if (!token) {
      return NextResponse.json(
        {
          error:
            "No Payload CMS API key configured. Set PAYLOAD_CMS_API_KEY in .env",
        },
        { status: 500 },
      );
    }

    const data = await fetchSubmissions(token, 50);

    if (!data) {
      return NextResponse.json(
        { error: "Failed to fetch submissions from Payload CMS" },
        { status: 502 },
      );
    }

    let created = 0;
    let skipped = 0;
    let errors = 0;
    const results: { id: number; status: string; enquiryId?: string }[] = [];

    for (const submission of data.docs) {
      try {
        const enquiryData = extractEnquiryData(submission);

        if (!enquiryData.firstName || !enquiryData.email) {
          results.push({ id: submission.id, status: "skipped_no_data" });
          skipped++;
          continue;
        }

        // Check if already synced (by sourceUrl containing submission ID or by email + timestamp match)
        const submissionDate = new Date(submission.createdAt);
        const windowStart = new Date(submissionDate.getTime() - 60000); // 1 min before
        const windowEnd = new Date(submissionDate.getTime() + 60000); // 1 min after

        const existing = await prisma.enquiry.findFirst({
          where: {
            email: enquiryData.email,
            source: "WEBSITE_FORM",
            createdAt: { gte: windowStart, lte: windowEnd },
          },
        });

        if (existing) {
          results.push({
            id: submission.id,
            status: "already_synced",
            enquiryId: existing.id,
          });
          skipped++;
          continue;
        }

        // Also check by sourceUrl if it contains the submission ID
        const existingByRef = await prisma.enquiry.findFirst({
          where: {
            sourceUrl: { contains: `submission:${submission.id}` },
          },
        });

        if (existingByRef) {
          results.push({
            id: submission.id,
            status: "already_synced",
            enquiryId: existingByRef.id,
          });
          skipped++;
          continue;
        }

        // Create the enquiry
        const enquiry = await prisma.enquiry.create({
          data: {
            firstName: enquiryData.firstName,
            lastName: enquiryData.lastName || "-",
            email: enquiryData.email,
            phone: enquiryData.phone || "-",
            message: enquiryData.message || null,
            source: "WEBSITE_FORM",
            sourceUrl: enquiryData.sourceUrl
              ? `${enquiryData.sourceUrl} | submission:${submission.id}`
              : `submission:${submission.id}`,
            status: "NEW",
            segment: "Buyer",
            priority: "Medium",
          },
        });

        // Auto-assign
        try {
          const { autoAssignEnquiry } = await import("@/lib/lead-routing");
          await autoAssignEnquiry(enquiry.id);
        } catch {
          // Non-critical
        }

        results.push({
          id: submission.id,
          status: "created",
          enquiryId: enquiry.id,
        });
        created++;

        console.log(
          `[SYNC] Created enquiry from submission #${submission.id}: ${enquiry.id} - ${enquiryData.firstName} ${enquiryData.lastName}`,
        );
      } catch (err) {
        console.error(
          `[SYNC] Error processing submission #${submission.id}:`,
          err,
        );
        results.push({ id: submission.id, status: "error" });
        errors++;
      }
    }

    // Notify admins if new enquiries were created
    if (created > 0) {
      await notifySuperAdmins(
        "SYSTEM_ALERT",
        `Synced ${created} Website Enquiries`,
        `${created} new enquiries were imported from the website. ${skipped} were already synced.`,
        "/clients/enquiries",
      );
    }

    return NextResponse.json({
      success: true,
      total: data.docs.length,
      created,
      skipped,
      errors,
      results,
    });
  } catch (error) {
    console.error("[SYNC] Sync failed:", error);
    return NextResponse.json(
      { error: "Sync failed", details: String(error) },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "Form Submissions Sync",
    description:
      "POST to this endpoint to sync form submissions from the website CMS",
  });
}
