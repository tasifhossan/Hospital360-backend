/**
 * SchedulerComparison.demo.ts
 *
 * Run with: npm run demo:comparison
 *
 * Comparative benchmarking proof-of-concept. Generates a single, identical
 * patient workload (using a mocked arrival process) and runs it through all
 * four scheduling algorithms:
 *   1. FCFS (Baseline)
 *   2. Priority + Aging
 *   3. Multilevel Queue
 *   4. Shortest Job First (SJF)
 *
 * Each run uses a fresh ResourceManager and SimulationClock instance to isolate
 * the tests. It outputs a comparison table showing performance metrics for wait times.
 */

import { ResourceManager } from "../ResourceManager";
import { PatientGenerator } from "../PatientGenerator";
import { SimulationClock } from "../SimulationClock";
import { createScheduler, SchedulerType } from "./SchedulerRegistry";
import { Patient } from "../../types/patient";

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

interface BenchmarkResult {
  algorithm: string;
  avgWaitMs: number;
  maxWaitMs: number;
  maxWaitPatient: string;
  highPriorityAvgWaitMs: number;
  patientsServed: number;
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

/**
 * Runs a full simulation run for a specific scheduler type using a cloned patient workload.
 */
function runSimulationRun(
  schedulerType: SchedulerType,
  workload: Patient[]
): Promise<BenchmarkResult> {
  return new Promise((resolve) => {
    const totalPatients = workload.length;
    const clonedWorkload = clonePatients(workload);

    // Constrained resources to enforce scheduling contention
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

    // Fast-running clock (10ms real-world ticks) for rapid benchmarking
    const clock = new SimulationClock(rm, scheduler, generator, {
      tickIntervalMs: 10,
      simulatedMsPerTick: 1000,
    });

    // Tracking maps
    const treatmentStartedTimes = new Map<string, number>();
    const patientData = new Map<string, Patient>();

    // Store references to all workload patients
    for (const p of clonedWorkload) {
      patientData.set(p.id, p);
    }

    clock.onTick((state) => {
      currentSimTime = state.simulatedTime;

      // Track when each patient starts treatment
      for (const p of state.activeTreatments) {
        if (!treatmentStartedTimes.has(p.id)) {
          treatmentStartedTimes.set(p.id, currentSimTime);
        }
      }

      // Check if simulation is complete (no remaining patients in queue, active, or upcoming)
      const finished =
        state.queue.length === 0 &&
        state.activeTreatments.length === 0 &&
        state.completedCount === totalPatients;

      if (finished) {
        clock.stop();

        // Calculate benchmark stats
        let totalWaitMs = 0;
        let maxWaitMs = 0;
        let maxWaitPatient = "None";
        let highPriorityCount = 0;
        let highPriorityTotalWaitMs = 0;

        treatmentStartedTimes.forEach((startTime, patientId) => {
          const original = patientData.get(patientId)!;
          const waitTime = startTime - original.arrivalTime;
          totalWaitMs += waitTime;

          if (waitTime > maxWaitMs) {
            maxWaitMs = waitTime;
            maxWaitPatient = `${original.name} (${original.id}, ${original.priority})`;
          }

          if (original.priority === "HIGH") {
            highPriorityCount += 1;
            highPriorityTotalWaitMs += waitTime;
          }
        });

        resolve({
          algorithm: scheduler.name,
          avgWaitMs: Math.round(totalWaitMs / totalPatients),
          maxWaitMs,
          maxWaitPatient,
          highPriorityAvgWaitMs:
            highPriorityCount > 0
              ? Math.round(highPriorityTotalWaitMs / highPriorityCount)
              : 0,
          patientsServed: state.completedCount,
        });
      }
    });

    clock.start();
  });
}

async function main() {
  console.log("=== Generating Workload Stream (Identical for all Schedulers) ===");

  // Pre-generate a list of 25 patients with Poisson arrival intervals
  const sourceGenerator = new PatientGenerator({
    arrivalMode: "POISSON",
    avgArrivalsPerMinute: 120, // High arrival rate to cause queue contention
  });
  const masterWorkload = sourceGenerator.generateBatch(25, 0);

  // Print a summary of workload priorities
  const highCount = masterWorkload.filter((p) => p.priority === "HIGH").length;
  const medCount = masterWorkload.filter((p) => p.priority === "MEDIUM").length;
  const lowCount = masterWorkload.filter((p) => p.priority === "LOW").length;
  console.log(
    `Workload size: 25 patients (HIGH: ${highCount}, MEDIUM: ${medCount}, LOW: ${lowCount})\n`
  );

  console.log("Running Benchmarks...");
  const fcfsResult = await runSimulationRun("FCFS", masterWorkload);
  const priorityAgingResult = await runSimulationRun("PRIORITY_AGING", masterWorkload);
  const mlqResult = await runSimulationRun("MULTILEVEL", masterWorkload);
  const sjfResult = await runSimulationRun("SJF", masterWorkload);

  console.log("\n=== BENCHMARK COMPARISON TABLE ===");
  console.table([
    fcfsResult,
    priorityAgingResult,
    mlqResult,
    sjfResult,
  ]);

  console.log("\nKey Viva Talking Points / Punchlines:");
  console.log(
    `1. FCFS (Baseline): Average wait was ${fcfsResult.avgWaitMs}ms. Can cause high wait times for late-arriving emergencies due to head-of-line blocking.`
  );
  console.log(
    `2. Priority + Aging: Average HIGH wait was ${priorityAgingResult.highPriorityAvgWaitMs}ms. Starvation of LOW priority is prevented via dynamic wait-time priority boosting.`
  );
  console.log(
    `3. Multilevel Queue: Average HIGH wait was ${mlqResult.highPriorityAvgWaitMs}ms. Strict class separation ensures HIGH priority is handled first, while starvation guard (limit 3) prevents LOW from starving.`
  );
  console.log(
    `4. Shortest Job First: Average wait was ${sjfResult.avgWaitMs}ms. Provably optimal for average wait time, but can increase max wait times for longer HIGH priority cases.`
  );
}

main().catch((err) => {
  console.error("Benchmarking failed:", err);
  process.exit(1);
});
