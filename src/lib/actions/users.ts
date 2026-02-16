"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { auth, type ExtendedSession } from "@/lib/auth";
import { hash } from "bcryptjs";
import type { UserRole, Office } from "@prisma/client";
import { auditLog } from "@/lib/audit";

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

  const where: Record<string, unknown> = {};
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

  if (!isSelfUpdate && !isAdmin) {
    throw new Error("Unauthorized");
  }

  // Non-admins can only update firstName/lastName
  if (!isAdmin) {
    const { firstName, lastName } = data;
    data = { firstName, lastName };
  }

  const user = await prisma.user.update({
    where: { id },
    data,
  });

  await auditLog("UPDATE", "User", id, data as Record<string, unknown>);

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
