import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * Webhook endpoint for Payload CMS form submissions.
 * Handles all 3 website forms and creates CRM enquiries automatically.
 *
 * Form 1 (Contact Form):  full-name, email, phone, message
 * Form 2 (Enquiry Form):  firstname, surname, email, phone, message, pageURL
 * Form 3 (Home Contact):  name, surname, email, phone
 */

const WEBHOOK_SECRET = process.env.WEBSITE_WEBHOOK_SECRET;

interface FormSubmissionField {
  field: string;
  value: string;
}

interface PayloadFormSubmission {
  form?: number | { id: number; title?: string };
  submissionData?: FormSubmissionField[];
  // Direct field format (alternative payload shape)
  [key: string]: unknown;
}

function getFieldValue(
  fields: FormSubmissionField[],
  ...names: string[]
): string {
  for (const name of names) {
    const field = fields.find(
      (f) => f.field.toLowerCase() === name.toLowerCase()
    );
    if (field?.value) return field.value;
  }
  return "";
}

function splitFullName(fullName: string): {
  firstName: string;
  lastName: string;
} {
  const trimmed = fullName.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

export async function POST(request: NextRequest) {
  // Verify webhook secret if configured
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
    const body: PayloadFormSubmission = await request.json();

    // Extract form ID
    const formId =
      typeof body.form === "object" ? body.form?.id : body.form;

    // Extract submission fields
    const fields: FormSubmissionField[] = body.submissionData || [];

    if (fields.length === 0) {
      return NextResponse.json(
        { error: "No submission data found" },
        { status: 400 }
      );
    }

    // Map fields based on form ID
    let firstName = "";
    let lastName = "";
    let email = "";
    let phone = "";
    let message = "";
    let sourceUrl = "";
    let formName = "Website";

    switch (formId) {
      case 1: {
        // Contact Form: full-name, email, phone, message
        formName = "Contact Form";
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
        formName = "Enquiry Form";
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
        formName = "Home Contact";
        firstName = getFieldValue(fields, "name", "firstname", "first-name");
        lastName = getFieldValue(fields, "surname", "last-name", "lastname");
        email = getFieldValue(fields, "email");
        phone = getFieldValue(fields, "phone");
        break;
      }
      default: {
        // Generic fallback: try common field names
        formName = `Website Form #${formId || "unknown"}`;
        firstName = getFieldValue(
          fields,
          "firstname",
          "first-name",
          "name",
          "full-name"
        );
        lastName = getFieldValue(fields, "surname", "last-name", "lastname");
        email = getFieldValue(fields, "email");
        phone = getFieldValue(fields, "phone");
        message = getFieldValue(fields, "message");
        sourceUrl = getFieldValue(fields, "pageURL", "pageurl");

        // Handle full-name splitting for fallback
        if (!lastName && firstName.includes(" ")) {
          const split = splitFullName(firstName);
          firstName = split.firstName;
          lastName = split.lastName;
        }
        break;
      }
    }

    // Validate required fields
    if (!firstName || !email) {
      return NextResponse.json(
        { error: "Missing required fields: firstName and email are required" },
        { status: 400 }
      );
    }

    // Check for duplicate submissions (same email within last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const duplicate = await prisma.enquiry.findFirst({
      where: {
        email: email.toLowerCase().trim(),
        createdAt: { gte: fiveMinutesAgo },
        source: "WEBSITE_FORM",
      },
    });

    if (duplicate) {
      return NextResponse.json(
        { message: "Duplicate submission detected", enquiryId: duplicate.id },
        { status: 200 }
      );
    }

    // Create the enquiry
    const enquiry = await prisma.enquiry.create({
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim() || "-",
        email: email.toLowerCase().trim(),
        phone: phone.trim() || "-",
        message: message.trim() || null,
        source: "WEBSITE_FORM",
        sourceUrl: sourceUrl.trim() || null,
        status: "NEW",
        segment: "Buyer",
        priority: "Medium",
      },
    });

    // Try auto-assign via lead routing (non-critical)
    try {
      const { autoAssignEnquiry } = await import("@/lib/lead-routing");
      await autoAssignEnquiry(enquiry.id);
    } catch {
      // Lead routing is non-critical
    }

    console.log(
      `[WEBHOOK] New enquiry created from ${formName}: ${enquiry.id} - ${firstName} ${lastName} (${email})`
    );

    return NextResponse.json(
      {
        success: true,
        enquiryId: enquiry.id,
        message: `Enquiry created from ${formName}`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[WEBHOOK] Failed to process form submission:", error);
    return NextResponse.json(
      { error: "Failed to process form submission" },
      { status: 500 }
    );
  }
}

// Also handle GET for health check
export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "Website Form Webhook",
    forms: [
      { id: 1, name: "Contact Form" },
      { id: 2, name: "Enquiry Form" },
      { id: 3, name: "Home Contact" },
    ],
  });
}
