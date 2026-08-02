import { prisma } from "../../lib/prisma";

export interface AuditLogUser {
  userId?: string | null;
  email: string;
}

/**
 * Log a privileged action to the audit logs in Neon PostgreSQL.
 */
export async function logAction(
  user: AuditLogUser | undefined | null,
  action: string,
  details: any
): Promise<void> {
  const userId = user?.userId || null;
  const userEmail = user?.email || "system@hospital360.local";

  try {
    await prisma.auditLog.create({
      data: {
        userId,
        userEmail,
        action,
        details: details || {},
      },
    });
  } catch (error) {
    console.error(`[AuditLogger] Failed to write audit log for action ${action}:`, error);
  }
}
