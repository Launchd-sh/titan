import { db } from "$src/db";
import type { Prisma } from "@prisma/client";

type AuditEvent = {
  organizationId: string;
  projectId?: string;
  actorUserId: string;
  action: string;
  targetType: "organization" | "project";
  targetId: string;
  metadata?: Prisma.InputJsonValue | null;
};

export async function createAuditLog(event: AuditEvent) {
  await db.auditLog.create({
    data: {
      organizationId: event.organizationId,
      projectId: event.projectId,
      actorUserId: event.actorUserId,
      action: event.action,
      targetType: event.targetType,
      targetId: event.targetId,
      metadata: event.metadata ?? undefined,
    },
  });
}

export function parseAuditLogLimit(limit?: string) {
  if (!limit) return 50;
  const parsed = Number.parseInt(limit, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return 50;
  return Math.min(parsed, 200);
}
