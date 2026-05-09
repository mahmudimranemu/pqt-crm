import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const total = await db.user.count();
  console.log(`\n== Total users ==\n${total}`);

  const byRole = await db.user.groupBy({ by: ["role"], _count: true });
  console.log(`\n== By role ==`);
  byRole.forEach((r) => console.log(`  ${r.role}: ${r._count}`));

  const sample = await db.user.findMany({
    select: { id: true, email: true },
    take: 5,
    orderBy: { createdAt: "asc" },
  });
  console.log(`\n== ID format sample ==`);
  sample.forEach((u) => console.log(`  ${u.id}  ${u.email}`));

  const hashSample = await db.$queryRaw<
    { hash_prefix: string; count: bigint }[]
  >`SELECT SUBSTRING("password" FROM 1 FOR 4) AS hash_prefix, COUNT(*)::bigint AS count
    FROM "User" GROUP BY hash_prefix ORDER BY count DESC`;
  console.log(`\n== Password hash prefixes ==`);
  hashSample.forEach((r) => console.log(`  '${r.hash_prefix}': ${r.count}`));

  const byActive = await db.user.groupBy({ by: ["isActive"], _count: true });
  console.log(`\n== Active vs inactive ==`);
  byActive.forEach((r) => console.log(`  isActive=${r.isActive}: ${r._count}`));

  const byOffice = await db.user.groupBy({ by: ["office"], _count: true });
  console.log(`\n== By office ==`);
  byOffice.forEach((r) => console.log(`  ${r.office ?? "NULL"}: ${r._count}`));

  const dupeEmails = await db.$queryRaw<
    { email: string; n: bigint }[]
  >`SELECT LOWER(email) AS email, COUNT(*)::bigint AS n
    FROM "User" GROUP BY LOWER(email) HAVING COUNT(*) > 1`;
  console.log(`\n== Duplicate emails (case-insensitive) ==`);
  if (dupeEmails.length === 0) console.log("  (none)");
  dupeEmails.forEach((r) => console.log(`  ${r.email}: ${r.n}`));

  const nullishNames = await db.user.count({
    where: {
      OR: [{ firstName: null }, { lastName: null }, { firstName: "" }, { lastName: "" }],
    },
  });
  console.log(`\n== Users with missing first/last name ==\n${nullishNames}`);

  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
