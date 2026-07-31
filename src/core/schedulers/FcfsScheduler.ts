/**
 * FcfsScheduler.ts
 *
 * First-Come, First-Served (FCFS) scheduling implementation.
 *
 * OS Analogue:
 * - FCFS Scheduling = Non-preemptive FIFO scheduling.
 *   This is the simplest CPU scheduling algorithm. Processes are dispatched
 *   in the exact order they arrive in the ready queue.
 *
 * Weakness / Viva Talking Points:
 * - **Convoy Effect / Head-of-Line (HOL) Blocking**:
 *   If a process requesting intensive resources or having a very long treatment
 *   duration (CPU burst) is at the front of the queue, all subsequent processes
 *   (even quick, low-resource, or critical emergency processes) are blocked
 *   waiting for it to finish.
 * - **No Priority Support**:
 *   A critical emergency patient (HIGH priority) arriving 1ms after a routine
 *   checkup patient (LOW priority) must wait behind them. This simulates a lack
 *   of priority queueing or preemptive scheduling, illustrating why real-time OS
 *   kernels require priority-based scheduling with preemption and aging.
 */

import { Patient } from "../../types/patient";
import { Scheduler } from "./Scheduler";

export class FcfsScheduler implements Scheduler {
  readonly name = "First Come First Served (FCFS)";
  private queue: Patient[] = [];

  enqueue(patient: Patient): void {
    // If not already set, record when the patient was enqueued
    if (patient.queuedAt === undefined) {
      patient.queuedAt = Date.now();
    }
    // FCFS enqueues at the end of the queue.
    // Order is strictly arrival time. We can sort or rely on sequential insertions.
    // To be perfectly robust against out-of-order enqueue calls, we sort by arrivalTime.
    this.queue.push(patient);
    this.queue.sort((a, b) => a.arrivalTime - b.arrivalTime);
  }

  next(): Patient | undefined {
    return this.queue.shift();
  }

  peekQueue(): Patient[] {
    return [...this.queue];
  }

  queueLength(): number {
    return this.queue.length;
  }
}
