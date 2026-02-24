import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM_EMAIL =
  process.env.SMTP_FROM || "PropertyQuestTurkey CRM <noreply@propertyquestturkey.com>";
const APP_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<boolean> {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error("[EMAIL] SMTP not configured. Set SMTP_USER and SMTP_PASS in .env");
    return false;
  }

  try {
    await transporter.sendMail({ from: FROM_EMAIL, to, subject, html });
    console.log(`[EMAIL] Sent "${subject}" to ${to}`);
    return true;
  } catch (error) {
    console.error("[EMAIL] Failed to send:", error);
    return false;
  }
}

export function emailVerificationTemplate(
  name: string,
  newEmail: string,
  token: string,
): { subject: string; html: string } {
  const verifyUrl = `${APP_URL}/api/auth/verify-email?token=${token}`;
  return {
    subject: "Verify Your New Email Address — PropertyQuestTurkey CRM",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dc2626; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">PropertyQuestTurkey CRM</h1>
        </div>
        <div style="padding: 32px; background: #fff; border: 1px solid #e5e7eb;">
          <h2 style="margin-top: 0;">Verify Your New Email</h2>
          <p>Hi ${name},</p>
          <p>You requested to change your email address to <strong>${newEmail}</strong>.</p>
          <p>Click the button below to verify this email address:</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${verifyUrl}" style="background: #dc2626; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Verify Email Address
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">This link expires in 1 hour. If you didn't request this change, you can safely ignore this email.</p>
          <p style="color: #6b7280; font-size: 14px;">Or copy this link: <a href="${verifyUrl}">${verifyUrl}</a></p>
        </div>
      </div>
    `,
  };
}

export function passwordResetTemplate(
  name: string,
  token: string,
): { subject: string; html: string } {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;
  return {
    subject: "Reset Your Password — PropertyQuestTurkey CRM",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dc2626; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">PropertyQuestTurkey CRM</h1>
        </div>
        <div style="padding: 32px; background: #fff; border: 1px solid #e5e7eb;">
          <h2 style="margin-top: 0;">Reset Your Password</h2>
          <p>Hi ${name},</p>
          <p>We received a request to reset your password. Click the button below to set a new password:</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}" style="background: #dc2626; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Reset Password
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
          <p style="color: #6b7280; font-size: 14px;">Or copy this link: <a href="${resetUrl}">${resetUrl}</a></p>
        </div>
      </div>
    `,
  };
}

export function emailChangeRequestTemplate(
  requesterName: string,
  requesterRole: string,
  currentEmail: string,
  newEmail: string,
): { subject: string; html: string } {
  const usersUrl = `${APP_URL}/settings/users`;
  return {
    subject: `Email Change Request — ${requesterName} — PropertyQuestTurkey CRM`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dc2626; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">PropertyQuestTurkey CRM</h1>
        </div>
        <div style="padding: 32px; background: #fff; border: 1px solid #e5e7eb;">
          <h2 style="margin-top: 0;">Email Change Request</h2>
          <p>A user has requested an email address change:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
            <tr>
              <td style="padding: 8px; font-weight: bold; color: #374151; width: 140px;">User</td>
              <td style="padding: 8px; color: #111827;">${requesterName}</td>
            </tr>
            <tr style="background: #f9fafb;">
              <td style="padding: 8px; font-weight: bold; color: #374151;">Role</td>
              <td style="padding: 8px; color: #111827;">${requesterRole}</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: bold; color: #374151;">Current Email</td>
              <td style="padding: 8px; color: #111827;">${currentEmail}</td>
            </tr>
            <tr style="background: #f9fafb;">
              <td style="padding: 8px; font-weight: bold; color: #374151;">Requested Email</td>
              <td style="padding: 8px; color: #dc2626; font-weight: bold;">${newEmail}</td>
            </tr>
          </table>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${usersUrl}" style="background: #dc2626; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Manage Users
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">Log in and navigate to Settings &rarr; Users to update this user's email address.</p>
        </div>
      </div>
    `,
  };
}

export function emailChangedConfirmationTemplate(
  name: string,
  oldEmail: string,
  newEmail: string,
): { subject: string; html: string } {
  return {
    subject: "Your Email Address Has Been Updated — PropertyQuestTurkey CRM",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dc2626; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">PropertyQuestTurkey CRM</h1>
        </div>
        <div style="padding: 32px; background: #fff; border: 1px solid #e5e7eb;">
          <h2 style="margin-top: 0;">Email Address Updated</h2>
          <p>Hi ${name},</p>
          <p>Your email address has been successfully changed.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
            <tr>
              <td style="padding: 8px; font-weight: bold; color: #374151; width: 140px;">Previous Email</td>
              <td style="padding: 8px; color: #6b7280;">${oldEmail}</td>
            </tr>
            <tr style="background: #f9fafb;">
              <td style="padding: 8px; font-weight: bold; color: #374151;">New Email</td>
              <td style="padding: 8px; color: #111827; font-weight: bold;">${newEmail}</td>
            </tr>
          </table>
          <p style="color: #6b7280; font-size: 14px;">If you did not request this change, please contact your administrator immediately.</p>
        </div>
      </div>
    `,
  };
}
