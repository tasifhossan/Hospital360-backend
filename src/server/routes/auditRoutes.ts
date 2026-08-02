import { Router, Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { requireAuth, requireRole } from "../auth/authMiddleware";

export function createAuditRouter(): Router {
  const router = Router();

  // GET / - Paginated, filtered list of audit log entries (Admin only)
  router.get("/", requireAuth, requireRole("ADMIN"), async (req: Request, res: Response) => {
    const { action, userEmail, page = "1", limit = "20" } = req.query;

    const parsedPage = parseInt(page as string, 10);
    const parsedLimit = parseInt(limit as string, 10);

    const currentPage = isNaN(parsedPage) || parsedPage <= 0 ? 1 : parsedPage;
    const currentLimit = isNaN(parsedLimit) || parsedLimit <= 0 ? 20 : parsedLimit;
    const skip = (currentPage - 1) * currentLimit;

    // Build filter where clause
    const where: any = {};
    if (action) {
      where.action = action as string;
    }
    if (userEmail) {
      where.userEmail = {
        contains: userEmail as string,
        mode: "insensitive", // case-insensitive search
      };
    }

    try {
      const totalCount = await prisma.auditLog.count({ where });
      const logs = await prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: "desc" },
        skip,
        take: currentLimit,
      });

      return res.status(200).json({
        success: true,
        message: "Audit logs retrieved successfully.",
        data: {
          logs,
          pagination: {
            total: totalCount,
            page: currentPage,
            limit: currentLimit,
            totalPages: Math.ceil(totalCount / currentLimit),
          },
        },
      });
    } catch (error: any) {
      console.error("[AuditRoutes] Error retrieving audit logs:", error);
      return res.status(500).json({
        success: false,
        message: `Failed to retrieve audit logs: ${error.message}`,
      });
    }
  });

  return router;
}
