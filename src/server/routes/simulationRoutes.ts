/**
 * simulationRoutes.ts
 *
 * OS Analogue:
 * - Simulation system calls.
 *   Exposes entry points for user-space control programs to query state
 *   and control the simulation engine (start, stop, reset, configure scheduling policy).
 */

import { Router, Request, Response } from "express";
import { SimulationClock } from "../../core/SimulationClock";
import { ResourceManager } from "../../core/ResourceManager";
import { createScheduler, SchedulerType } from "../../core/schedulers/SchedulerRegistry";
import { getSimulationStateSnapshot } from "../socket/broadcastState";
import { RESOURCE_CAPACITY } from "../../types/resources";
import { logAction } from "../auditLog/auditLogger";

export function createSimulationRouter(
  clock: SimulationClock,
  state: { currentAlgorithm: SchedulerType }
): Router {
  const router = Router();

  // POST /start
  router.post("/start", (req: Request, res: Response) => {
    if (clock.isRunning()) {
      return res.status(200).json({
        success: true,
        message: "Simulation is already running.",
      });
    }

    clock.start();
    logAction((req as any).user, "SIMULATION_STARTED", {});
    return res.status(200).json({
      success: true,
      message: "Simulation started successfully.",
    });
  });

  // POST /stop
  router.post("/stop", (req: Request, res: Response) => {
    if (!clock.isRunning()) {
      return res.status(200).json({
        success: true,
        message: "Simulation is already stopped.",
      });
    }

    clock.stop();
    logAction((req as any).user, "SIMULATION_STOPPED", {});
    return res.status(200).json({
      success: true,
      message: "Simulation stopped successfully.",
    });
  });

  // POST /reset
  router.post("/reset", (req: Request, res: Response) => {
    clock.stop();
    clock.reset();

    // Recreate ResourceManager with fresh clean capacities
    const freshResourceManager = new ResourceManager(RESOURCE_CAPACITY);
    clock.setResourceManager(freshResourceManager);

    // Recreate Scheduler of current algorithm type to clear waiting queue
    const freshScheduler = createScheduler(state.currentAlgorithm, {
      getCurrentTime: () => clock.getSimulatedTime(),
    });
    clock.setScheduler(freshScheduler);

    logAction((req as any).user, "SIMULATION_RESET", {});

    return res.status(200).json({
      success: true,
      message: "Simulation reset successfully. Ready queue and resources cleared.",
    });
  });

  // POST /algorithm
  router.post("/algorithm", (req: Request, res: Response) => {
    const { algorithm } = req.body;

    const validAlgorithms: SchedulerType[] = ["FCFS", "PRIORITY_AGING", "MULTILEVEL", "SJF"];
    if (!validAlgorithms.includes(algorithm)) {
      return res.status(400).json({
        success: false,
        message: `Invalid algorithm. Supported algorithms: ${validAlgorithms.join(", ")}`,
      });
    }

    if (clock.isRunning()) {
      return res.status(409).json({
        success: false,
        message: "Cannot swap scheduling algorithm while the simulation is running. Please stop the simulation first.",
      });
    }

    const oldAlgo = state.currentAlgorithm;
    state.currentAlgorithm = algorithm as SchedulerType;
    const freshScheduler = createScheduler(state.currentAlgorithm, {
      getCurrentTime: () => clock.getSimulatedTime(),
    });
    clock.setScheduler(freshScheduler);

    logAction((req as any).user, "ALGORITHM_SWITCHED", { from: oldAlgo, to: algorithm });

    return res.status(200).json({
      success: true,
      message: `Successfully swapped scheduling algorithm to ${algorithm}.`,
    });
  });

  // GET /state
  router.get("/state", (req: Request, res: Response) => {
    const snapshot = getSimulationStateSnapshot(clock);
    return res.status(200).json({
      success: true,
      message: "Current simulation state snapshot.",
      data: snapshot,
    });
  });

  // GET /stats
  router.get("/stats", (req: Request, res: Response) => {
    const stats = clock.getStats();
    return res.status(200).json({
      success: true,
      message: "Simulation statistics.",
      data: stats,
    });
  });

  return router;
}
