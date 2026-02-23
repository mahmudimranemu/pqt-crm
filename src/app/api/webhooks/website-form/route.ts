import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { notifySuperAdmins } from "@/lib/notifications";

/**
 * Webhook endpoint for Payload CMS form submissions.
 * Handles all 3 website forms and creates CRM enquiries automatically.
 *
 * Form 1 (Contact Form):  full-name, email, phone, message
 * Form 2 (Enquiry Form):  firstname, surname, email, phone, message, pageURL
 * Form 3 (Home Contact):  name, surname, email, phone
 *
 * Expected payload from Payload CMS afterChange hook:
 * {
 *   source: "website",
 *   formTitle: "Enquiry Form",
 *   formId: 2,
 *   submissionId: 45,
 *   submissionData: [{ field: "firstname", value: "John" }, ...],
 *   submittedAt: "2026-02-24T..."
 * }
 *
 * Also supports legacy formats:
 * - { doc: { form, submissionData, ... } }
 * - { form, submissionData: [...] }
 */

const WEBHOOK_SECRET = process.env.WEBSITE_WEBHOOK_SECRET;

interface FormField {
  field: string;
  value: string;
}

function getFieldValue(fields: FormField[], ...names: string[]): string {
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

export async function POST(request: NextRequest) {
  // Verify webhook secret if configured
  if (WEBHOOK_SECRET) {
    const authHeader = request.headers.get("authorization");
    const secretParam = request.nextUrl.searchParams.get("secret");
    const providedSecret =
      authHeader?.replace("Bearer ", "") || secretParam || "";

    if (providedSecret !== WEBHOOK_SECRET) {
      console.error("[WEBHOOK] Unauthorized: invalid secret");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const rawBody = await request.text();
    console.log("[WEBHOOK] Received payload:", rawBody.substring(0, 1000));

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody);
    } catch {
      console.error("[WEBHOOK] Invalid JSON body");
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 },
      );
    }

    // Handle multiple payload formats:
    // 1. Our afterChange hook: { source, formId, submissionId, submissionData, formTitle }
    // 2. Payload afterChange doc wrapper: { doc: { form, submissionData, ... } }
    // 3. Direct form-builder format: { form, submissionData: [...] }

    // Extract form ID - check all possible locations
    const formId: number | undefined =
      (body.formId as number) || // Our hook format
      (() => {
        const doc = body.doc as Record<string, unknown> | undefined;
        const formRef = doc?.form ?? body.form;
        if (typeof formRef === "number") return formRef;
        if (typeof formRef === "object" && formRef !== null)
          return (formRef as { id: number }).id;
        return undefined;
      })();

    // Extract submission ID
    const submissionId: number | null =
      (body.submissionId as number) || // Our hook format
      (body.doc as Record<string, unknown>)?.id as number ||
      (body.id as number) ||
      null;

    // Extract formTitle if provided
    const formTitle = (body.formTitle as string) || "";

    // Extract submission fields - try multiple locations
    let fields: FormField[] = [];

    if (Array.isArray(body.submissionData)) {
      fields = body.submissionData as FormField[];
    } else if (
      body.doc &&
      Array.isArray((body.doc as Record<string, unknown>).submissionData)
    ) {
      fields = (body.doc as Record<string, unknown>)
        .submissionData as FormField[];
    }

    // Fallback: try to build fields from top-level keys
    if (fields.length === 0) {
      const knownKeys = [
        "firstname",
        "surname",
        "email",
        "phone",
        "message",
        "full-name",
        "name",
        "pageURL",
      ];
      for (const key of knownKeys) {
        const val = (body[key] as string);
        if (val) {
          fields.push({ field: key, value: val });
        }
      }
    }

    if (fields.length === 0) {
      console.error("[WEBHOOK] No submission data found in payload");
      return NextResponse.json(
        { error: "No submission data found" },
        { status: 400 },
      );
    }

    // Map fields based on form ID
    let firstName = "";
    let lastName = "";
    let email = "";
    let phone = "";
    let message = "";
    let sourceUrl = "";
    let formName = formTitle || "Website";

    switch (formId) {
      case 1: {
        if (!formName || formName === "Website") formName = "Contact Form";
        const fullName = getFieldValue(
          fields,
          "full-name",
          "fullname",
          "name",
        );
        const split = splitFullName(fullName);
        firstName = split.firstName;
        lastName = split.lastName;
        email = getFieldValue(fields, "email");
        phone = getFieldValue(fields, "phone");
        message = getFieldValue(fields, "message");
        break;
      }
      case 2: {
        if (!formName || formName === "Website") formName = "Enquiry Form";
        firstName = getFieldValue(fields, "firstname", "first-name", "name");
        lastName = getFieldValue(fields, "surname", "last-name", "lastname");
        email = getFieldValue(fields, "email");
        phone = getFieldValue(fields, "phone");
        message = getFieldValue(fields, "message");
        sourceUrl = getFieldValue(fields, "pageURL", "pageurl", "page-url");
        break;
      }
      case 3: {
        if (!formName || formName === "Website") formName = "Home Contact";
        firstName = getFieldValue(fields, "name", "firstname", "first-name");
        lastName = getFieldValue(fields, "surname", "last-name", "lastname");
        email = getFieldValue(fields, "email");
        phone = getFieldValue(fields, "phone");
        break;
      }
      default: {
        if (!formName || formName === "Website")
          formName = `Website Form #${formId || "unknown"}`;
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

    firstName = firstName.trim();
    lastName = lastName.trim();
    email = email.toLowerCase().trim();
    phone = phone.trim();

    // Validate required fields
    if (!firstName || !email) {
      console.error(
        `[WEBHOOK] Missing required fields. firstName="${firstName}", email="${email}"`,
      );
      return NextResponse.json(
        {
          error:
            "Missing required fields: firstName and email are required",
        },
        { status: 400 },
      );
    }

    // Check for duplicate (by submission ID reference or by email + time)
    if (submissionId) {
      const existingByRef = await prisma.enquiry.findFirst({
        where: { sourceUrl: { contains: `submission:${submissionId}` } },
      });
      if (existingByRef) {
        return NextResponse.json(
          {
            message: "Already synced",
            enquiryId: existingByRef.id,
          },
          { status: 200 },
        );
      }
    }

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const duplicate = await prisma.enquiry.findFirst({
      where: {
        email,
        createdAt: { gte: fiveMinutesAgo },
        source: "WEBSITE_FORM",
      },
    });

    if (duplicate) {
      return NextResponse.json(
        {
          message: "Duplicate submission detected",
          enquiryId: duplicate.id,
        },
        { status: 200 },
      );
    }

    // Create the enquiry
    const enquiry = await prisma.enquiry.create({
      data: {
        firstName,
        lastName: lastName || "-",
        email,
        phone: phone || "-",
        message: message.trim() || null,
        source: "WEBSITE_FORM",
        sourceUrl: submissionId
          ? sourceUrl
            ? `${sourceUrl} | submission:${submissionId}`
            : `submission:${submissionId}`
          : sourceUrl || null,
        status: "NEW",
        segment: "Buyer",
        priority: "Medium",
      },
    });

    // Try auto-assign (non-critical)
    try {
      const { autoAssignEnquiry } = await import("@/lib/lead-routing");
      await autoAssignEnquiry(enquiry.id);
    } catch {
      // Lead routing is non-critical
    }

    // Notify super admins
    await notifySuperAdmins(
      "SYSTEM_ALERT",
      `New Website Enquiry (${formName})`,
      `${firstName} ${lastName} (${email}) submitted a form on the website`,
      "/clients/enquiries",
    );

    console.log(
      `[WEBHOOK] New enquiry created from ${formName}: ${enquiry.id} - ${firstName} ${lastName} (${email})`,
    );

    return NextResponse.json(
      {
        success: true,
        enquiryId: enquiry.id,
        message: `Enquiry created from ${formName}`,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[WEBHOOK] Failed to process form submission:", error);
    return NextResponse.json(
      { error: "Failed to process form submission" },
      { status: 500 },
    );
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "Website Form Webhook",
    forms: [
      { id: 1, name: "Contact Form", fields: "full-name, email, phone, message" },
      { id: 2, name: "Enquiry Form", fields: "firstname, surname, email, phone, message, pageURL" },
      { id: 3, name: "Home Contact", fields: "name, surname, email, phone" },
    ],
    usage: "POST to this endpoint with Payload CMS form submission data",
  });
}
