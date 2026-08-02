import { prisma } from "../../lib/prisma";
import * as fs from "fs/promises";
import * as path from "path";

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

  const executeWrite = () =>
    prisma.auditLog.create({
      data: {
        userId,
        userEmail,
        action,
        details: details || {},
      },
    });

  try {
    await executeWrite();
  } catch (error) {
    console.error(`[AuditLogger] Failed to write audit log for action ${action} (attempt 1):`, error);
    
    // Retry once with 200ms backoff
    try {
      await new Promise((resolve) => setTimeout(resolve, 200));
      await executeWrite();
    } catch (retryError) {
      console.error(`[AuditLogger] Failed to write audit log for action ${action} (attempt 2):`, retryError);
      
      // Fallback: append to a local log file backend/logs/audit-fallback.log
      try {
        const logsDir = path.join(__dirname, "../../../logs");
        await fs.mkdir(logsDir, { recursive: true });
        const logPath = path.join(logsDir, "audit-fallback.log");
        
        const fallbackEntry = JSON.stringify({
          timestamp: new Date().toISOString(),
          userId,
          userEmail,
          action,
          details: details || {},
          error: retryError instanceof Error ? retryError.message : String(retryError),
        }) + "\n";
        
        await fs.appendFile(logPath, fallbackEntry, "utf-8");
      } catch (fsError) {
        console.error(`[AuditLogger] Critical Error: Failed to write to fallback log file:`, fsError);
      }
    }
  }
}
