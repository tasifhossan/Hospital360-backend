/**
 * SchedulerRegistry.ts
 *
 * A lookup registry and factory function for creating and swapping scheduler
 * algorithms by name at runtime.
 *
 * OS Analogue:
 * - Scheduler Class Table / System Call Dispatch Table:
 *   In OS design, different scheduling modules (or system call handlers) are often
 *   referenced through an index array or class table. Swapping the active scheduler
 *   policy is done by changing a kernel pointer to reference a different dispatch
 *   table, without modifying the core CPU instruction scheduling loop.
 */

import { Scheduler } from "./Scheduler";
import { FcfsScheduler } from "./FcfsScheduler";
import { PriorityAgingScheduler } from "./PriorityAgingScheduler";
import { MultilevelQueueScheduler } from "./MultilevelQueueScheduler";
import { SjfScheduler } from "./SjfScheduler";

export type SchedulerType = "FCFS" | "PRIORITY_AGING" | "MULTILEVEL" | "SJF";

export interface SchedulerOptions {
  /** For PRIORITY_AGING: wait time (ms) to decrease weight score by 1 */
  agingRateMs?: number;
  /** For PRIORITY_AGING: dynamic simulated time getter */
  getCurrentTime?: () => number;
  /** For MULTILEVEL: dispatches from higher queues before forcing one from lower */
  starvationGuardThreshold?: number;
}

/**
 * Factory function to create scheduler instances by their registry key name.
 */
export function createScheduler(
  type: SchedulerType,
  options: SchedulerOptions = {}
): Scheduler {
  switch (type) {
    case "FCFS":
      return new FcfsScheduler();
    case "PRIORITY_AGING":
      return new PriorityAgingScheduler(
        options.agingRateMs ?? 1000,
        options.getCurrentTime
      );
    case "MULTILEVEL":
      return new MultilevelQueueScheduler(
        options.starvationGuardThreshold ?? 5
      );
    case "SJF":
      return new SjfScheduler();
    default:
      throw new Error(`Unsupported scheduler type: ${type}`);
  }
}
