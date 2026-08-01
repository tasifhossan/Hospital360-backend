/**
 * comparisonRoutes.ts
 *
 * REST Gateway for comparative simulation benchmarks.
 *
 * OS Analogue/Concept:
 * - Syscall interface for benchmark performance execution and profiling tools.
 *   Similar to triggering a workload profile (like `perf` or `sysbench`) and persisting
 *   results in system diagnostics tables.
 */

import { Router, Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { ComparisonRunner } from "../../core/comparison/ComparisonRunner";
import { PatientGenerator } from "../../core/PatientGenerator";

export function createComparisonRouter(): Router {
  const router = Router();

  /**
   * POST /run
   * Body: { patientCount?: number, seed?: string }
   * Runs the 4 scheduling algorithms against an identical workload of generated patients and persists results.
   */
  router.post("/run", async (req: Request, res: Response) => {
    const { patientCount, seed } = req.body;

    const parsedCount = patientCount ? parseInt(patientCount, 10) : 25;
    if (isNaN(parsedCount) || parsedCount <= 0 || !Number.isInteger(parsedCount)) {
      return res.status(400).json({
        success: false,
        message: "patientCount must be a positive integer.",
      });
    }

    console.log(`[Comparison] Starting run with ${parsedCount} patients (seed/description: ${seed ?? "none"})`);
    const startTime = Date.now();

    try {
      // 1. Generate workload
      const generator = new PatientGenerator({
        arrivalMode: "POISSON",
        avgArrivalsPerMinute: 120, // high arrival rate to cause queue contention
      });
      const workload = generator.generateBatch(parsedCount, 0);

      // 2. Run simulation comparison
      const results = await ComparisonRunner.runComparison(workload);

      // 3. Persist to SQLite via Prisma
      const run = await prisma.comparisonRun.create({
        data: {
          patientCount: parsedCount,
          workloadSeed: seed ? String(seed) : "Poisson (avg 120 arrivals/min)",
          algorithmResults: {
            create: results.map((r) => ({
              algorithm: r.algorithm,
              avgWaitMs: r.metrics.avgWaitMs,
              maxWaitMs: r.metrics.maxWaitMs,
              avgTurnaroundMs: r.metrics.avgTurnaroundMs,
              maxTurnaroundMs: r.metrics.maxTurnaroundMs,
              highPriorityAvgWaitMs: r.metrics.highPriorityAvgWaitMs,
              highPriorityAvgResponseMs: r.metrics.highPriorityAvgResponseMs,
              utilizationPercent: r.metrics.utilizationPercent,
              patientsServed: r.metrics.patientsServed,
            })),
          },
        },
        include: {
          algorithmResults: true,
        },
      });

      const durationMs = Date.now() - startTime;
      console.log(`[Comparison] Completed run with ${parsedCount} patients in ${durationMs}ms`);

      return res.status(200).json({
        success: true,
        message: "Simulation comparison ran and persisted successfully.",
        data: run,
      });
    } catch (err: any) {
      console.error("[Comparison] Error during comparison run:", err);
      return res.status(500).json({
        success: false,
        message: `Failed to run comparison simulation: ${err.message}`,
      });
    }
  });

  /**
   * GET /runs
   * Returns a list of past comparison runs (headers only, order by newest).
   */
  router.get("/runs", async (req: Request, res: Response) => {
    try {
      const runs = await prisma.comparisonRun.findMany({
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          createdAt: true,
          patientCount: true,
          workloadSeed: true,
          notes: true,
        },
      });

      return res.status(200).json({
        success: true,
        message: "Comparison run history retrieved successfully.",
        data: runs,
      });
    } catch (err: any) {
      console.error("[Comparison] Error fetching runs:", err);
      return res.status(500).json({
        success: false,
        message: `Failed to fetch run history: ${err.message}`,
      });
    }
  });

  /**
   * GET /runs/:id
   * Returns a full comparison run with all algorithm results.
   */
  router.get("/runs/:id", async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const run = await prisma.comparisonRun.findUnique({
        where: { id: id as string },
        include: {
          algorithmResults: true,
        },
      });

      if (!run) {
        return res.status(404).json({
          success: false,
          message: `Comparison run with ID ${id} not found.`,
        });
      }

      return res.status(200).json({
        success: true,
        message: "Comparison run details retrieved successfully.",
        data: run,
      });
    } catch (err: any) {
      console.error("[Comparison] Error fetching run detail:", err);
      return res.status(500).json({
        success: false,
        message: `Failed to fetch run detail: ${err.message}`,
      });
    }
  });

  /**
   * DELETE /runs/:id
   * Deletes a comparison run and its associated algorithm results.
   */
  router.delete("/runs/:id", async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      await prisma.comparisonRun.delete({
        where: { id: id as string },
      });

      return res.status(200).json({
        success: true,
        message: `Successfully deleted comparison run ${id}.`,
      });
    } catch (err: any) {
      console.error("[Comparison] Error deleting run:", err);
      return res.status(500).json({
        success: false,
        message: `Failed to delete comparison run: ${err.message}`,
      });
    }
  });

  return router;
}
