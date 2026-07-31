/**
 * MultilevelQueueScheduler.ts
 *
 * Multilevel Queue scheduler implementing three priority-level sub-queues.
 *
 * OS Analogue:
 * - Multilevel Queue (MLQ):
 *   In systems where processes fall into distinct classes (e.g., interactive/real-time
 *   vs. system vs. background batch), the scheduler partition the ready queue into
 *   multiple separate queues. Each queue has its own priority level and scheduling algorithm.
 * - Starvation Guard / Queue Favoring:
 *   Strict priority MLQ scheduling (always draining HIGH first) causes starvation
 *   of lower-priority queues. Real operating systems resolve this either by time-slicing
 *   between queues (e.g. 80% CPU to HIGH, 20% to LOW) or by keeping dispatch counters.
 *   Our starvation guard forces a lower-queue dispatch after N consecutive dispatches
 *   from higher queues to prevent complete starvation of LOW tasks.
 */

import { Patient } from "../../types/patient";
import { Scheduler } from "./Scheduler";

export class MultilevelQueueScheduler implements Scheduler {
  readonly name = "Multilevel Queue Scheduler";

  private readonly highQueue: Patient[] = [];
  private readonly mediumQueue: Patient[] = [];
  private readonly lowQueue: Patient[] = [];

  private readonly starvationGuardThreshold: number;
  private consecutiveHigherDispatches = 0;

  /**
   * @param starvationGuardThreshold Number of consecutive dispatches from higher queues (HIGH/MEDIUM)
   *                                  before forcing a dispatch from a waiting lower queue.
   */
  constructor(starvationGuardThreshold = 5) {
    this.starvationGuardThreshold = starvationGuardThreshold;
  }

  enqueue(patient: Patient): void {
    if (patient.queuedAt === undefined) {
      patient.queuedAt = Date.now();
    }

    switch (patient.priority) {
      case "HIGH":
        this.highQueue.push(patient);
        this.highQueue.sort((a, b) => a.arrivalTime - b.arrivalTime);
        break;
      case "MEDIUM":
        this.mediumQueue.push(patient);
        this.mediumQueue.sort((a, b) => a.arrivalTime - b.arrivalTime);
        break;
      case "LOW":
        this.lowQueue.push(patient);
        this.lowQueue.sort((a, b) => a.arrivalTime - b.arrivalTime);
        break;
      default:
        throw new Error(`Unknown patient priority: ${patient.priority}`);
    }
  }

  next(): Patient | undefined {
    const hasHigh = this.highQueue.length > 0;
    const hasMedium = this.mediumQueue.length > 0;
    const hasLow = this.lowQueue.length > 0;

    // If there is nothing queued, return undefined
    if (!hasHigh && !hasMedium && !hasLow) {
      return undefined;
    }

    // Starvation Guard check:
    // If threshold reached and we have lower priority patients waiting, force dispatching one.
    if (
      this.consecutiveHigherDispatches >= this.starvationGuardThreshold &&
      (hasMedium || hasLow)
    ) {
      this.consecutiveHigherDispatches = 0; // Reset counter
      if (hasMedium) {
        return this.mediumQueue.shift();
      } else {
        return this.lowQueue.shift();
      }
    }

    // Normal strict priority dispatching
    if (hasHigh) {
      // If we have patients waiting in MEDIUM or LOW, increment starvation counter
      if (hasMedium || hasLow) {
        this.consecutiveHigherDispatches += 1;
      }
      return this.highQueue.shift();
    }

    if (hasMedium) {
      // If we have patients waiting in LOW, increment starvation counter
      if (hasLow) {
        this.consecutiveHigherDispatches += 1;
      }
      return this.mediumQueue.shift();
    }

    // Serve LOW priority
    this.consecutiveHigherDispatches = 0; // Reset counter
    return this.lowQueue.shift();
  }

  peekQueue(): Patient[] {
    // Concatenate sub-queues in strict priority order for external inspection
    return [...this.highQueue, ...this.mediumQueue, ...this.lowQueue];
  }

  queueLength(): number {
    return this.highQueue.length + this.mediumQueue.length + this.lowQueue.length;
  }
}
