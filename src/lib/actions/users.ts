"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { auth, type ExtendedSession } from "@/lib/auth";
import { hash, compare } from "bcryptjs";
import { randomBytes } from "crypto";
import type { UserRole, Office } from "@prisma/client";
import { auditLog } from "@/lib/audit";
import {
  sendEmail,
  emailVerificationTemplate,
  passwordResetTemplate,
  emailChangeRequestTemplate,
  emailChangedConfirmationTemplate,
} from "@/lib/email";
import { notifySuperAdmins, notify } from "@/lib/notifications";

// Password validation: min 8 chars, 1 uppercase, 1 number, 1 special char
function validatePassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(password))
    return "Password must contain at least 1 uppercase letter";
  if (!/[0-9]/.test(password)) return "Password must contain at least 1 number";
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password))
    return "Password must contain at least 1 special character";
  return null;
}

// Get all users
export async function getUsers(params?: {
  role?: UserRole;
  office?: Office;
  page?: number;
  limit?: number;
}) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    throw new Error("Unauthorized - Admin access required");
  }

  const { role, office, page = 1, limit = 25 } = params || {};
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {
    // Hide soft-deleted users
    NOT: { email: { startsWith: "deleted_" } },
  };
  if (role) where.role = role;
  if (office) where.office = office;

  // Non-super admins can only see users in their office
  if (session.user.role !== "SUPER_ADMIN") {
    where.office = session.user.office;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        office: true,
        isActive: true,
        lastSeen: true,
        createdAt: true,
        _count: {
          select: {
            sales: true,
            bookings: true,
            clients: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return { users, total, pages: Math.ceil(total / limit), currentPage: page };
}

// Get single user
export async function getUserById(id: string) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  // Users can view themselves, admins can view others
  if (
    session.user.id !== id &&
    !["SUPER_ADMIN", "ADMIN"].includes(session.user.role)
  ) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      office: true,
      isActive: true,
      phone: true,
      avatar: true,
      twoFactorEnabled: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          sales: true,
          bookings: true,
          clients: true,
        },
      },
    },
  });

  if (!user) throw new Error("User not found");

  return user;
}

// Create user
export async function createUser(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  office: Office;
}) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    throw new Error("Unauthorized - Admin access required");
  }

  // Validate password strength
  const passwordError = validatePassword(data.password);
  if (passwordError) {
    throw new Error(passwordError);
  }

  // Check if email already exists
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existing) {
    throw new Error("A user with this email already exists");
  }

  // Hash password
  const hashedPassword = await hash(data.password, 12);

  const user = await prisma.user.create({
    data: {
      ...data,
      password: hashedPassword,
    },
  });

  await auditLog("CREATE", "User", user.id, {
    email: data.email,
    role: data.role,
    office: data.office,
  });

  revalidatePath("/settings/users");
  return user;
}

// Update user
export async function updateUser(
  id: string,
  data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    avatar?: string;
    role?: UserRole;
    office?: Office;
    isActive?: boolean;
  },
) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  // Users can update their own name, admins can update anything
  const isSelfUpdate = session.user.id === id;
  const isAdmin = ["SUPER_ADMIN", "ADMIN"].includes(session.user.role);
  const isSuperAdmin = session.user.role === "SUPER_ADMIN";

  if (!isSelfUpdate && !isAdmin) {
    throw new Error("Unauthorized");
  }

  // Non-admins can only update their own profile fields
  if (!isAdmin) {
    const { firstName, lastName, phone, avatar } = data;
    data = { firstName, lastName, phone, avatar };
  }

  // Only SUPER_ADMIN can change email
  if (data.email && !isSuperAdmin) {
    delete data.email;
  }

  // Check email uniqueness if changing email
  let oldEmail: string | null = null;
  if (data.email) {
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing && existing.id !== id) {
      throw new Error("A user with this email already exists");
    }
    // Capture old email before update for change detection
    const currentUser = await prisma.user.findUnique({
      where: { id },
      select: { email: true },
    });
    if (currentUser && currentUser.email !== data.email) {
      oldEmail = currentUser.email;
    }
  }

  const user = await prisma.user.update({
    where: { id },
    data,
  });

  await auditLog("UPDATE", "User", id, data as Record<string, unknown>);

  // If email was changed by admin, notify the user and send confirmation email
  if (oldEmail && data.email) {
    await notify(
      id,
      "EMAIL_CHANGED",
      "Email Address Updated",
      `Your email has been successfully changed from ${oldEmail} to ${data.email}`,
      "/settings/profile",
    );

    const { subject, html } = emailChangedConfirmationTemplate(
      `${user.firstName} ${user.lastName}`,
      oldEmail,
      data.email,
    );
    sendEmail(data.email, subject, html).catch((err) =>
      console.error("[EMAIL] Failed to send email changed confirmation:", err),
    );
  }

  revalidatePath("/settings/users");
  revalidatePath("/settings/profile");
  return user;
}

// Update password
export async function updatePassword(id: string, newPassword: string) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  // Users can update their own password, super admins can update anyone's
  if (session.user.id !== id && session.user.role !== "SUPER_ADMIN") {
    throw new Error("Unauthorized");
  }

  // Validate password strength
  const passwordError = validatePassword(newPassword);
  if (passwordError) {
    throw new Error(passwordError);
  }

  const hashedPassword = await hash(newPassword, 12);

  await prisma.user.update({
    where: { id },
    data: { password: hashedPassword },
  });

  return { success: true };
}

// Deactivate user
export async function deactivateUser(id: string) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    throw new Error("Unauthorized - Admin access required");
  }

  // Cannot deactivate yourself
  if (session.user.id === id) {
    throw new Error("Cannot deactivate your own account");
  }

  await prisma.user.update({
    where: { id },
    data: { isActive: false },
  });

  await auditLog("UPDATE", "User", id, { isActive: false });

  revalidatePath("/settings/users");
  return { success: true };
}

// Reactivate user
export async function reactivateUser(id: string) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    throw new Error("Unauthorized - Admin access required");
  }

  await prisma.user.update({
    where: { id },
    data: { isActive: true },
  });

  await auditLog("UPDATE", "User", id, { isActive: true });

  revalidatePath("/settings/users");
  return { success: true };
}

// Delete user — SUPER_ADMIN only
// Soft-deletes (deactivates) the user and cleans up non-critical data.
// Business records (bookings, sales, deals, leads) are preserved for history.
export async function deleteUser(id: string) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role !== "SUPER_ADMIN") {
    throw new Error("Unauthorized - Only Super Admin can delete users");
  }

  // Cannot delete yourself
  if (session.user.id === id) {
    throw new Error("Cannot delete your own account");
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: { email: true, firstName: true, lastName: true },
  });
  if (!user) throw new Error("User not found");

  await auditLog("DELETE", "User", id, {
    email: user.email,
    name: `${user.firstName} ${user.lastName}`,
  });

  // Use a transaction to clean up related data and soft-delete the user
  await prisma.$transaction(async (tx) => {
    // Nullify optional foreign keys on business records
    await tx.client.updateMany({
      where: { assignedAgentId: id },
      data: { assignedAgentId: null },
    });
    await tx.enquiry.updateMany({
      where: { assignedAgentId: id },
      data: { assignedAgentId: null },
    });

    // Delete non-critical user-specific data
    await tx.notification.deleteMany({ where: { userId: id } });
    await tx.loginLog.deleteMany({ where: { userId: id } });
    await tx.teamMember.deleteMany({ where: { userId: id } });

    // Soft-delete: deactivate the user and scrub personal data
    await tx.user.update({
      where: { id },
      data: {
        isActive: false,
        email: `deleted_${id}@removed.local`,
        password: "DELETED",
        phone: null,
        avatar: null,
        emailVerifyToken: null,
        emailVerifyNewEmail: null,
        emailVerifyExpires: null,
        passwordResetToken: null,
        passwordResetExpires: null,
        twoFactorSecret: null,
      },
    });
  }, { timeout: 30000 });

  revalidatePath("/settings/users");
  return { success: true };
}

// Change password (with current password verification)
export async function changePassword(
  currentPassword: string,
  newPassword: string,
) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  // Fetch user with password hash
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { password: true },
  });
  if (!user) throw new Error("User not found");

  // Verify current password
  const isValid = await compare(currentPassword, user.password);
  if (!isValid) {
    throw new Error("Current password is incorrect");
  }

  // Validate new password strength
  const passwordError = validatePassword(newPassword);
  if (passwordError) {
    throw new Error(passwordError);
  }

  const hashedPassword = await hash(newPassword, 12);

  await prisma.user.update({
    where: { id: session.user.id },
    data: { password: hashedPassword },
  });

  await auditLog("UPDATE", "User", session.user.id, {
    action: "password_changed",
  });

  return { success: true };
}

// Request email change (SUPER_ADMIN only) — sends verification to new email
export async function requestEmailChange(newEmail: string) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role !== "SUPER_ADMIN") {
    throw new Error("Only Super Admin can change email");
  }

  const normalizedEmail = newEmail.toLowerCase().trim();

  // Check if email already exists
  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (existing && existing.id !== session.user.id) {
    throw new Error("A user with this email already exists");
  }
  if (existing && existing.id === session.user.id) {
    throw new Error("This is already your current email");
  }

  // Generate token
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      emailVerifyToken: token,
      emailVerifyNewEmail: normalizedEmail,
      emailVerifyExpires: expires,
    },
  });

  // Send verification email to the NEW address
  const { subject, html } = emailVerificationTemplate(
    session.user.firstName,
    normalizedEmail,
    token,
  );
  const sent = await sendEmail(normalizedEmail, subject, html);

  if (!sent) {
    throw new Error(
      "Failed to send verification email. Check SMTP settings in .env",
    );
  }

  return { success: true };
}

// Request email change (any authenticated non-super-admin user)
// Notifies all SUPER_ADMINs via in-app notification and email
export async function requestEmailChangeByUser(newEmail: string) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const normalizedEmail = newEmail.toLowerCase().trim();

  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    throw new Error("Please enter a valid email address");
  }

  if (normalizedEmail === session.user.email.toLowerCase()) {
    throw new Error("This is already your current email address");
  }

  // Check the new email is not already taken
  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });
  if (existing) {
    throw new Error("A user with this email already exists");
  }

  const roleLabels: Record<string, string> = {
    ADMIN: "Admin",
    SALES_MANAGER: "Senior Consultant",
    SALES_AGENT: "Consultant",
    VIEWER: "Junior Consultant",
  };
  const roleLabel = roleLabels[session.user.role] ?? session.user.role;
  const fullName = `${session.user.firstName} ${session.user.lastName}`;

  const message =
    `[${fullName}] [${roleLabel}] sent a request to change [${session.user.email}] to [${normalizedEmail}]`;

  // In-app notifications for all SUPER_ADMINs
  await notifySuperAdmins(
    "EMAIL_CHANGE_REQUEST",
    "Email Change Request",
    message,
    "/settings/users",
  );

  // Send email to all active SUPER_ADMINs
  const superAdmins = await prisma.user.findMany({
    where: { role: "SUPER_ADMIN", isActive: true },
    select: { email: true },
  });

  const { subject, html } = emailChangeRequestTemplate(
    fullName,
    roleLabel,
    session.user.email,
    normalizedEmail,
  );

  await Promise.allSettled(
    superAdmins.map((admin) => sendEmail(admin.email, subject, html)),
  );

  await auditLog("UPDATE", "User", session.user.id, {
    action: "email_change_requested",
    currentEmail: session.user.email,
    requestedEmail: normalizedEmail,
  });

  return { success: true };
}

// Verify email change (called via API route when user clicks link)
export async function verifyEmailChange(token: string) {
  const user = await prisma.user.findFirst({
    where: {
      emailVerifyToken: token,
      emailVerifyExpires: { gt: new Date() },
    },
    select: {
      id: true,
      email: true,
      emailVerifyNewEmail: true,
    },
  });

  if (!user || !user.emailVerifyNewEmail) {
    throw new Error("Invalid or expired verification link");
  }

  // Check the new email isn't taken by someone else since the request
  const conflict = await prisma.user.findUnique({
    where: { email: user.emailVerifyNewEmail },
  });
  if (conflict && conflict.id !== user.id) {
    throw new Error("This email is already in use by another account");
  }

  const oldEmail = user.email;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      email: user.emailVerifyNewEmail,
      emailVerifyToken: null,
      emailVerifyNewEmail: null,
      emailVerifyExpires: null,
    },
  });

  await auditLog("UPDATE", "User", user.id, {
    action: "email_changed",
    oldEmail,
    newEmail: user.emailVerifyNewEmail,
  });

  return { success: true, newEmail: user.emailVerifyNewEmail };
}

// Request password reset (public — no auth required)
export async function requestPasswordReset(email: string) {
  const normalizedEmail = email.toLowerCase().trim();

  // Always return success to prevent email enumeration
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, firstName: true, isActive: true },
  });

  if (!user || !user.isActive) {
    // Don't reveal whether the email exists
    return { success: true };
  }

  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: token,
      passwordResetExpires: expires,
    },
  });

  const { subject, html } = passwordResetTemplate(user.firstName, token);
  await sendEmail(normalizedEmail, subject, html);

  return { success: true };
}

// Reset password using token (public — no auth required)
export async function resetPassword(token: string, newPassword: string) {
  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: token,
      passwordResetExpires: { gt: new Date() },
    },
    select: { id: true },
  });

  if (!user) {
    throw new Error("Invalid or expired reset link");
  }

  const passwordError = validatePassword(newPassword);
  if (passwordError) {
    throw new Error(passwordError);
  }

  const hashedPassword = await hash(newPassword, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpires: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });

  await auditLog("UPDATE", "User", user.id, {
    action: "password_reset",
  });

  return { success: true };
}
