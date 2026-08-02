/**
 * adminRoutes.ts
 *
 * OS Analogue:
 * - Dynamic resource hotplug / hardware configuration administration.
 *   Simulates adding hardware capacity (more CPUs, more memory frames) to the running kernel
 *   to resolve resource constraints or deadlocks dynamically.
 */

import { Router, Request, Response } from "express";
import { SimulationClock } from "../../core/SimulationClock";
import { logAction } from "../auditLog/auditLogger";

export function createAdminRouter(clock: SimulationClock): Router {
  const router = Router();

  // POST /doctors
  router.post("/doctors", (req: Request, res: Response) => {
    const { count } = req.body;

    if (typeof count !== "number" || count <= 0 || !Number.isInteger(count)) {
      return res.status(400).json({
        success: false,
        message: "Count must be a positive integer.",
      });
    }

    const rm = clock.getResourceManager();
    rm.increaseCapacity("doctor", count);

    logAction((req as any).user, "CAPACITY_INCREASED", { resource: "doctor", by: count });

    return res.status(200).json({
      success: true,
      message: `Successfully increased doctor capacity by ${count}.`,
      data: rm.getStatus()["doctor"],
    });
  });

  // POST /beds
  router.post("/beds", (req: Request, res: Response) => {
    const { count } = req.body;

    if (typeof count !== "number" || count <= 0 || !Number.isInteger(count)) {
      return res.status(400).json({
        success: false,
        message: "Count must be a positive integer.",
      });
    }

    const rm = clock.getResourceManager();
    rm.increaseCapacity("icuBed", count);

    logAction((req as any).user, "CAPACITY_INCREASED", { resource: "icuBed", by: count });

    return res.status(200).json({
      success: true,
      message: `Successfully increased ICU bed capacity by ${count}.`,
      data: rm.getStatus()["icuBed"],
    });
  });

  // GET /resources
  router.get("/resources", (req: Request, res: Response) => {
    const status = clock.getResourceManager().getStatus();
    return res.status(200).json({
      success: true,
      message: "Resource capacity and usage status.",
      data: status,
    });
  });

  return router;
}
