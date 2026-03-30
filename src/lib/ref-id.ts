import prisma from "@/lib/prisma";

export async function generateRefId(): Promise<string> {
  const lastEnquiry = await prisma.enquiry.findFirst({
    where: { refId: { startsWith: "PQT-" } },
    orderBy: { refId: "desc" },
    select: { refId: true },
  });
  const lastLead = await prisma.lead.findFirst({
    where: { refId: { startsWith: "PQT-" } },
    orderBy: { refId: "desc" },
    select: { refId: true },
  });
  const lastEnqNum = lastEnquiry?.refId
    ? parseInt(lastEnquiry.refId.replace("PQT-", ""), 10)
    : 0;
  const lastLeadNum = lastLead?.refId
    ? parseInt(lastLead.refId.replace("PQT-", ""), 10)
    : 0;
  const nextNum = Math.max(lastEnqNum, lastLeadNum) + 1;
  return `PQT-${String(nextNum).padStart(4, "0")}`;
}
