/**
 * ComparisonRunner.ts
 *
 * Runs a set of scheduling algorithms sequentially against an identical pre-generated
 * patient workload. Isolates each run using a fresh ResourceManager and SimulationClock.
 *
 * OS Analogue/Concept:
 * - Deterministic Workload Comparison: In OS benchmarking, algorithms are compared using
 *   the exact same trace of process arrivals, CPU burst times, and resource requests to
 *   ensure fairness.
 */

import { ResourceManager } from "../ResourceManager";
import { SimulationClock } from "../SimulationClock";
import { createScheduler, SchedulerType } from "../schedulers/SchedulerRegistry";
import { Patient } from "../../types/patient";
import { PatientGenerator } from "../PatientGenerator";
import { calculateMetrics, SimulationMetrics } from "../metrics/MetricsCalculator";

// Mock generator that feeds a pre-allocated queue of patients to the SimulationClock
class MockPatientGenerator extends PatientGenerator {
  private readonly pregeneratedPatients: Patient[];
  private currentIndex = 0;

  constructor(pregeneratedPatients: Patient[]) {
    // Pass dummy config
    super({ arrivalMode: "UNIFORM", avgArrivalsPerMinute: 60 });
    this.pregeneratedPatients = pregeneratedPatients;
  }

  override generateBatch(n: number, startTime: number): Patient[] {
    const batch = this.pregeneratedPatients.slice(
      this.currentIndex,
      this.currentIndex + n
    );
    this.currentIndex += n;
    return batch;
  }
}

function clonePatients(patients: Patient[]): Patient[] {
  return patients.map((p) => ({
    ...p,
    status: "WAITING",
    queuedAt: undefined,
    treatmentStartedAt: undefined,
    completedAt: undefined,
  }));
}

export interface ComparisonResult {
  algorithm: string;
  metrics: SimulationMetrics;
}

export class ComparisonRunner {
  /**
   * Runs a single simulation run for a specific scheduler type using a cloned patient workload.
   */
  static runSingle(
    schedulerType: SchedulerType,
    workload: Patient[]
  ): Promise<ComparisonResult> {
    return new Promise((resolve) => {
      const totalPatients = workload.length;
      const clonedWorkload = clonePatients(workload);

      // Constrained resources to enforce scheduling contention (matching baseline comparison)
      const rm = new ResourceManager({
        doctor: 2,
        nurse: 2,
        icuBed: 1,
        ventilator: 1,
        operationTheatre: 1,
        mriMachine: 1,
        ambulance: 1,
      });

      let currentSimTime = 0;

      const scheduler = createScheduler(schedulerType, {
        agingRateMs: 1000,
        getCurrentTime: () => currentSimTime,
        starvationGuardThreshold: 3, // Force lower priority dispatches quickly to see effect
      });

      const generator = new MockPatientGenerator(clonedWorkload);

      // Fast-running clock (2ms real-world ticks) for rapid benchmarking
      const clock = new SimulationClock(rm, scheduler, generator, {
        tickIntervalMs: 2,
        simulatedMsPerTick: 1000,
      });

      clock.onTick((state) => {
        currentSimTime = state.simulatedTime;

        // Check if simulation is complete (no remaining patients in queue, active, or upcoming)
        const finished =
          state.queue.length === 0 &&
          state.activeTreatments.length === 0 &&
          state.completedCount === totalPatients;

        if (finished) {
          clock.stop();

          // Extract completed patients with all mutated timestamps
          const completedPatients = clock.getCompletedPatients();

          // Get accumulated resource busy times
          const busyTimeMs = clock.getBusyTimeMs();

          // Get capacities from ResourceManager status
          const status = rm.getStatus();
          const capacities: any = {};
          Object.keys(status).forEach((res) => {
            capacities[res] = status[res].capacity;
          });

          const totalDuration = clock.getSimulatedTime();

          // Calculate benchmark stats
          const metrics = calculateMetrics(
            completedPatients,
            busyTimeMs,
            capacities,
            totalDuration
          );

          resolve({
            algorithm: schedulerType,
            metrics,
          });
        }
      });

      clock.start();
    });
  }

  /**
   * Runs the entire suite of algorithms sequentially on the same workload.
   */
  static async runComparison(
    workload: Patient[],
    algorithms: SchedulerType[] = ["FCFS", "PRIORITY_AGING", "MULTILEVEL", "SJF"]
  ): Promise<ComparisonResult[]> {
    const results: ComparisonResult[] = [];
    for (const algo of algorithms) {
      const res = await this.runSingle(algo, workload);
      results.push(res);
    }
    return results;
  }
}
