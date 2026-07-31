import { prisma } from "@/lib/prisma";

export async function createAuditLog(
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  details?: Record<string, any>
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        details: details || undefined,
      },
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
  }
}
