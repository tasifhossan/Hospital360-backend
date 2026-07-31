/**
 * PriorityAgingScheduler.ts
 *
 * Dynamic Priority scheduling with Aging anti-starvation mechanism.
 *
 * OS Analogue:
 * - Dynamic Priority Scheduling w/ Aging:
 *   In pure priority scheduling, lower-priority tasks can starve indefinitely
 *   if there is a continuous stream of higher-priority tasks. To prevent this,
 *   real-time operating systems (like Windows or Linux) implement "Aging".
 *   As a process waits in the READY queue, its dynamic priority is periodically
 *   boosted (increased). Eventually, its priority becomes high enough to preempt
 *   or run before newer high-priority processes, guaranteeing bounded wait times.
 * - Dynamic Priority Recalculation:
 *   The scheduler re-calculates the dynamic/effective priority of every waiting
 *   process at each scheduling tick (dispatch cycle) because wait times are
 *   constantly advancing.
 */

import { Patient } from "../../types/patient";
import { PRIORITY_WEIGHT } from "../../types/resources";
import { Scheduler } from "./Scheduler";

export class PriorityAgingScheduler implements Scheduler {
  readonly name = "Priority + Aging Scheduler";
  private queue: Patient[] = [];
  private readonly agingRateMs: number;
  private readonly getCurrentTime: () => number;

  /**
   * @param agingRateMs How many milliseconds of waiting are required to reduce (boost) the priority weight score by 1.
   * @param getCurrentTime Callback to retrieve the current simulated time (defaults to Date.now).
   */
  constructor(agingRateMs = 1000, getCurrentTime?: () => number) {
    this.agingRateMs = agingRateMs;
    this.getCurrentTime = getCurrentTime ?? (() => Date.now());
  }

  enqueue(patient: Patient): void {
    if (patient.queuedAt === undefined) {
      patient.queuedAt = this.getCurrentTime();
    }
    this.queue.push(patient);
  }

  /**
   * Sorts the queue by dynamic effective priority score, then pulls the highest-priority patient.
   * Effective Score = Base Priority Weight - (Wait Time / Aging Rate)
   * Lower score = higher priority = scheduled first.
   */
  next(): Patient | undefined {
    this.sortQueue();
    return this.queue.shift();
  }

  peekQueue(): Patient[] {
    this.sortQueue();
    return [...this.queue];
  }

  queueLength(): number {
    return this.queue.length;
  }

  /**
   * Sorts the ready queue based on dynamic effective priority.
   * Ties are broken by earliest arrival time (FCFS-fair).
   */
  private sortQueue(): void {
    const now = this.getCurrentTime();
    this.queue.sort((a, b) => {
      const scoreA = this.getEffectiveScore(a, now);
      const scoreB = this.getEffectiveScore(b, now);

      if (scoreA !== scoreB) {
        return scoreA - scoreB; // Lower score = higher priority
      }
      return a.arrivalTime - b.arrivalTime; // Earliest arrival first
    });
  }

  /**
   * Computes the current dynamic effective score of a patient.
   * Boosts priority (reduces score) based on waiting time in the queue.
   */
  private getEffectiveScore(patient: Patient, now: number): number {
    const baseWeight = PRIORITY_WEIGHT[patient.priority];
    const waitTimeMs = now - (patient.queuedAt ?? patient.arrivalTime);
    const boost = waitTimeMs / this.agingRateMs;
    return baseWeight - boost;
  }
}
