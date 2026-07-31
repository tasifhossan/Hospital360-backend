/**
 * patient.ts
 *
 * Defines the Patient interface, which represents the primary active entity
 * in the Hospital OS simulation.
 *
 * OS Analogue:
 * - Patient = Process / Process Control Block (PCB).
 *   Just like a process, a patient has a unique identifier, an arrival time,
 *   a priority level, a set of requested resources, a treatment duration
 *   (equivalent to CPU burst time), and tracks its scheduling state/lifecycle.
 * - requiredResources = Resource list requested by a process.
 *   These must be allocated to the patient for them to run (be treated).
 * - arrivalTime = Process arrival time.
 *   The timestamp when the patient becomes ready/available to enter the scheduler queue.
 */

import { Priority, ResourceType } from "./resources";

export interface Patient {
  /** Unique identifier for the patient (Process ID / PID) */
  id: string;

  /** Optional name for logging and demo readability */
  name?: string;

  /** Priority level of the patient ("HIGH" | "MEDIUM" | "LOW") */
  priority: Priority;

  /** Timestamp (ms) representing when the patient arrived at the hospital */
  arrivalTime: number;

  /** List of resource types required for treatment (Banker's Algorithm max claim / allocation request) */
  requiredResources: ResourceType[];

  /** How long (in simulated ms) the patient holds resources once treatment begins (CPU burst time) */
  treatmentDurationMs: number;

  /** Current lifecycle status of the process/patient */
  status: "WAITING" | "IN_TREATMENT" | "COMPLETED";

  /** Timestamp (ms) when the patient was inserted into the scheduler's queue */
  queuedAt?: number;

  /** Timestamp (ms) when resources were successfully acquired and treatment started */
  treatmentStartedAt?: number;

  /** Timestamp (ms) when treatment finished and resources were released */
  completedAt?: number;
}
