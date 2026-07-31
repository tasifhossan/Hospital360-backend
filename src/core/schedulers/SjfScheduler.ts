/**
 * SjfScheduler.ts
 *
 * Shortest Job First (SJF) scheduling implementation.
 *
 * OS Analogue:
 * - Shortest Job First (SJF):
 *   This is a non-preemptive algorithm that associates with each process the length
 *   of its next CPU burst (treatment duration in our simulation). When the CPU is
 *   free, the scheduler selects the waiting process with the smallest burst time.
 * - SJF is provably optimal:
 *   SJF yields the minimum average waiting time for a given set of processes.
 *
 * Weakness / Viva Talking Points:
 * - **Starvation / Indefinite Blocking**:
 *   If there is a steady stream of short jobs (e.g. LOW priority routine checkups),
 *   a long job (e.g. a HIGH priority patient requiring complex surgery/large treatmentDurationMs)
 *   could be starved forever at the back of the queue.
 * - **Difficult to Estimate Burst Time**:
 *   In real OS kernels, the exact burst time of a process cannot be known in advance
 *   before it runs. Real schedulers must estimate it using historical exponential averaging.
 *   In our simulator, `treatmentDurationMs` represents a perfect upfront estimation.
 */

import { Patient } from "../../types/patient";
import { Scheduler } from "./Scheduler";

export class SjfScheduler implements Scheduler {
  readonly name = "Shortest Job First (SJF)";
  private queue: Patient[] = [];

  enqueue(patient: Patient): void {
    if (patient.queuedAt === undefined) {
      patient.queuedAt = Date.now();
    }
    this.queue.push(patient);
    this.sortQueue();
  }

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

  private sortQueue(): void {
    this.queue.sort((a, b) => {
      if (a.treatmentDurationMs !== b.treatmentDurationMs) {
        return a.treatmentDurationMs - b.treatmentDurationMs;
      }
      return a.arrivalTime - b.arrivalTime; // Tie breaker: FCFS order
    });
  }
}
