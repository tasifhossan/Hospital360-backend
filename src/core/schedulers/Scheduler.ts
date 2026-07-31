/**
 * Scheduler.ts
 *
 * Defines the Scheduler interface. All scheduling algorithms (FCFS, Priority,
 * Priority + Aging, SJF, etc.) must implement this interface.
 *
 * OS Analogue:
 * - Scheduler Interface = CPU Scheduling Interface / Policy Pattern.
 *   In an OS, the dispatcher loop calls the scheduler to find out which process in
 *   the ready queue should execute next. By decoupling the scheduling policy
 *   (e.g., FCFS vs. Round Robin vs. Multi-Level Queue) from the mechanism
 *   (the simulation/dispatch clock), we can hot-swap algorithms at runtime
 *   without altering the clock loop or resource management layer.
 *
 * Why this interface is intentionally minimal:
 *   The SimulationClock should only care about enqueuing arrived processes and
 *   requesting the next process to be scheduled. The specific queue ordering,
 *   aging algorithms, and sorting logic are fully encapsulated within each
 *   Scheduler implementation.
 */

import { Patient } from "../../types/patient";

export interface Scheduler {
  /** Name of the scheduling algorithm (e.g. "First Come First Served") */
  readonly name: string;

  /**
   * Enqueue a patient into the ready queue.
   * Equivalent to moving a process into the READY state.
   */
  enqueue(patient: Patient): void;

  /**
   * Selects, removes, and returns the next patient to be scheduled.
   * Returns undefined if the ready queue is empty.
   * Equivalent to the scheduler selecting a process for CPU dispatch.
   */
  next(): Patient | undefined;

  /**
   * Returns an array of the currently queued patients in scheduling order
   * without mutating the queue. Useful for displaying the current state.
   */
  peekQueue(): Patient[];

  /**
   * Returns the number of patients currently waiting in the ready queue.
   */
  queueLength(): number;
}
