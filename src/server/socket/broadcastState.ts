/**
 * broadcastState.ts
 *
 * OS Analogue:
 * - Process Control Block (PCB) state serialization.
 *   Translates raw kernel-level structures (ready queues, thread tables, resource semaphores)
 *   into a serialized snapshot safe for external system calls or user-space rendering.
 */

import { SimulationClock } from "../../core/SimulationClock";

export interface PatientSnapshot {
  id: string;
  name?: string;
  priority: string;
  arrivalTime: number;
  queuedAt?: number;
  waitTime: number;
  requiredResources: string[];
}

export interface ActiveTreatmentSnapshot {
  patient: any;
  resourcesHeld: string[];
  timeRemaining: number;
}

export interface SimulationStateSnapshot {
  simulatedTime: number;
  schedulerName: string;
  queue: PatientSnapshot[];
  activeTreatments: ActiveTreatmentSnapshot[];
  resourceStatus: any;
  stats: {
    completedCount: number;
    avgWaitTimeMs: number;
  };
}

/**
 * Serializes the current simulation state into a plain JSON-safe snapshot.
 */
export function getSimulationStateSnapshot(clock: SimulationClock): SimulationStateSnapshot {
  const stats = clock.getStats();
  const simulatedTime = clock.getSimulatedTime();
  const scheduler = clock.getScheduler();
  const resourceManager = clock.getResourceManager();

  const queue: PatientSnapshot[] = scheduler.peekQueue().map((p) => ({
    id: p.id,
    name: p.name,
    priority: p.priority,
    arrivalTime: p.arrivalTime,
    queuedAt: p.queuedAt,
    waitTime: simulatedTime - p.arrivalTime,
    requiredResources: p.requiredResources,
  }));

  // Accessing private activeTreatments via cast
  const rawActiveTreatments = (clock as any).activeTreatments || [];
  const activeTreatments: ActiveTreatmentSnapshot[] = rawActiveTreatments.map((p: any) => {
    const endTime = (p.treatmentStartedAt ?? 0) + p.treatmentDurationMs;
    const timeRemaining = Math.max(0, endTime - simulatedTime);
    return {
      patient: p,
      resourcesHeld: resourceManager.getHeldResources(p.id),
      timeRemaining,
    };
  });

  return {
    simulatedTime,
    schedulerName: scheduler.name,
    queue,
    activeTreatments,
    resourceStatus: resourceManager.getStatus(),
    stats: {
      completedCount: stats.totalPatientsServed,
      avgWaitTimeMs: stats.averageWaitTimeMs,
    },
  };
}
