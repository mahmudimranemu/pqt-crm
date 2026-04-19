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

export async function generateLeadNumber(): Promise<string> {
  const lastLead = await prisma.lead.findFirst({
    orderBy: { createdAt: "desc" },
    select: { leadNumber: true },
  });
  let next = 1;
  if (lastLead?.leadNumber) {
    const num = parseInt(lastLead.leadNumber.replace("PQT-L-", ""), 10);
    if (!isNaN(num)) next = num + 1;
  }
  return `PQT-L-${String(next).padStart(4, "0")}`;
}
