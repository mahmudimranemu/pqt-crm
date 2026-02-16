"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth, type ExtendedSession } from "@/lib/auth";
import type { Office } from "@prisma/client";

export async function getTeams() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  return prisma.team.findMany({
    include: {
      manager: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      members: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
        },
      },
      _count: { select: { members: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function getTeamById(id: string) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  const team = await prisma.team.findUnique({
    where: { id },
    include: {
      manager: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
        },
      },
      members: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
              isActive: true,
            },
          },
        },
      },
    },
  });

  if (!team) throw new Error("Team not found");
  return team;
}

export async function createTeam(data: {
  name: string;
  description?: string;
  office?: Office;
  managerId: string;
  memberIds?: string[];
}) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    throw new Error("Admin access required");
  }

  const team = await prisma.team.create({
    data: {
      name: data.name,
      description: data.description,
      office: data.office || "HEAD_OFFICE",
      managerId: data.managerId,
    },
  });

  if (data.memberIds?.length) {
    await prisma.teamMember.createMany({
      data: data.memberIds.map((userId) => ({
        teamId: team.id,
        userId,
      })),
      skipDuplicates: true,
    });
  }

  revalidatePath("/settings/teams");
  return team;
}

export async function updateTeam(
  id: string,
  data: {
    name?: string;
    description?: string;
    office?: Office;
    managerId?: string;
  },
) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    throw new Error("Admin access required");
  }

  const team = await prisma.team.update({
    where: { id },
    data,
  });

  revalidatePath("/settings/teams");
  return team;
}

export async function addTeamMembers(teamId: string, memberIds: string[]) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    throw new Error("Admin access required");
  }

  await prisma.teamMember.createMany({
    data: memberIds.map((userId) => ({
      teamId,
      userId,
    })),
    skipDuplicates: true,
  });

  revalidatePath("/settings/teams");
}

export async function removeTeamMember(teamId: string, memberId: string) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    throw new Error("Admin access required");
  }

  await prisma.teamMember.deleteMany({
    where: { teamId, userId: memberId },
  });

  revalidatePath("/settings/teams");
}

export async function deleteTeam(id: string) {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) throw new Error("Unauthorized");

  if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    throw new Error("Admin access required");
  }

  // TeamMember has onDelete: Cascade, so members are auto-deleted
  await prisma.team.delete({ where: { id } });
  revalidatePath("/settings/teams");
}
