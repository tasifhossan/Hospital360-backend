/**
 * MetricsCalculator.ts
 *
 * Pure utility functions for calculating simulation metrics.
 *
 * OS Analogue/Textbook Concepts:
 * - Wait Time: The time a process spends waiting in the ready queue before being scheduled/allocated CPU cores.
 * - Turnaround Time: The total time elapsed from process submission/arrival to completion.
 *   Formula: Turnaround Time = Completion Time - Arrival Time (or Wait Time + Service Time).
 *   This is a common viva/exam distinction: wait time measures scheduler queueing delays,
 *   while turnaround time measures the total latency experienced by the process.
 * - Response Time (High Priority): The time from process arrival to the first time it gets scheduled (starts treatment).
 *   For a non-preemptive environment, response time is identical to wait time, but is analyzed
 *   separately as a crucial metric for interactive/real-time/emergency processes.
 * - Resource Utilization: The percentage of time a resource is busy.
 *   Formula: Utilization % = (Sum of busy time across all instances) / (Capacity * Total simulated duration) * 100.
 */

import { Patient } from "../../types/patient";
import { ResourceType } from "../../types/resources";

export interface SimulationMetrics {
  avgWaitMs: number;
  maxWaitMs: number;
  avgTurnaroundMs: number;
  maxTurnaroundMs: number;
  highPriorityAvgWaitMs: number;
  highPriorityAvgResponseMs: number;
  utilizationPercent: number; // average across all resource types
  patientsServed: number;
}

/**
 * Computes turnaround time for a patient.
 * Turnaround Time = completedAt - arrivalTime
 */
export function getTurnaroundTime(patient: Patient): number {
  if (patient.completedAt === undefined || patient.arrivalTime === undefined) {
    return 0;
  }
  return patient.completedAt - patient.arrivalTime;
}

/**
 * Computes response time for a patient.
 * Response Time = treatmentStartedAt - arrivalTime
 */
export function getResponseTime(patient: Patient): number {
  if (patient.treatmentStartedAt === undefined || patient.arrivalTime === undefined) {
    return 0;
  }
  return patient.treatmentStartedAt - patient.arrivalTime;
}

/**
 * Computes the full metrics suite for a completed simulation run.
 * 
 * @param patients The list of patients that went through the simulation
 * @param busyTimeMs The accumulated busy time (ms) for each resource type
 * @param capacities The capacity for each resource type
 * @param totalDuration The total simulated time duration (ms)
 */
export function calculateMetrics(
  patients: Patient[],
  busyTimeMs: Record<ResourceType, number>,
  capacities: Record<ResourceType, number>,
  totalDuration: number
): SimulationMetrics {
  const totalPatients = patients.length;
  if (totalPatients === 0) {
    return {
      avgWaitMs: 0,
      maxWaitMs: 0,
      avgTurnaroundMs: 0,
      maxTurnaroundMs: 0,
      highPriorityAvgWaitMs: 0,
      highPriorityAvgResponseMs: 0,
      utilizationPercent: 0,
      patientsServed: 0,
    };
  }

  let totalWaitMs = 0;
  let maxWaitMs = 0;
  let totalTurnaroundMs = 0;
  let maxTurnaroundMs = 0;

  let highPriorityCount = 0;
  let highPriorityTotalWaitMs = 0;
  let highPriorityTotalResponseMs = 0;

  for (const p of patients) {
    // Wait time: treatment started time - arrival time
    const waitTime = getResponseTime(p); // In our system, wait time = response time since treatment starts once scheduled
    totalWaitMs += waitTime;
    if (waitTime > maxWaitMs) {
      maxWaitMs = waitTime;
    }

    // Turnaround time: completion time - arrival time
    const turnaround = getTurnaroundTime(p);
    totalTurnaroundMs += turnaround;
    if (turnaround > maxTurnaroundMs) {
      maxTurnaroundMs = turnaround;
    }

    if (p.priority === "HIGH") {
      highPriorityCount += 1;
      highPriorityTotalWaitMs += waitTime;
      highPriorityTotalResponseMs += getResponseTime(p);
    }
  }

  // Calculate utilization per resource, then average them
  const resourceTypes = Object.keys(capacities) as ResourceType[];
  let utilizationSum = 0;

  for (const res of resourceTypes) {
    const busyTime = busyTimeMs[res] ?? 0;
    const cap = capacities[res] ?? 1;
    const maxPossibleBusy = cap * totalDuration;
    const resUtil = maxPossibleBusy > 0 ? (busyTime / maxPossibleBusy) * 100 : 0;
    utilizationSum += resUtil;
  }

  const avgUtilization = resourceTypes.length > 0 ? utilizationSum / resourceTypes.length : 0;

  return {
    avgWaitMs: Math.round(totalWaitMs / totalPatients),
    maxWaitMs,
    avgTurnaroundMs: Math.round(totalTurnaroundMs / totalPatients),
    maxTurnaroundMs,
    highPriorityAvgWaitMs:
      highPriorityCount > 0 ? Math.round(highPriorityTotalWaitMs / highPriorityCount) : 0,
    highPriorityAvgResponseMs:
      highPriorityCount > 0 ? Math.round(highPriorityTotalResponseMs / highPriorityCount) : 0,
    utilizationPercent: parseFloat(avgUtilization.toFixed(2)),
    patientsServed: totalPatients,
  };
}
