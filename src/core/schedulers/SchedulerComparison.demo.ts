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
 * This CLI wrapper uses ComparisonRunner to execute the bench suite.
 */

import { PatientGenerator } from "../PatientGenerator";
import { ComparisonRunner } from "../comparison/ComparisonRunner";

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
  const results = await ComparisonRunner.runComparison(masterWorkload);

  const tableData = results.map((r) => ({
    Algorithm: r.algorithm,
    "Avg Wait (ms)": r.metrics.avgWaitMs,
    "Max Wait (ms)": r.metrics.maxWaitMs,
    "Avg Turnaround (ms)": r.metrics.avgTurnaroundMs,
    "Emergency Avg Resp (ms)": r.metrics.highPriorityAvgResponseMs,
    "Avg Resource Util %": r.metrics.utilizationPercent,
    "Served": r.metrics.patientsServed,
  }));

  console.log("\n=== BENCHMARK COMPARISON TABLE ===");
  console.table(tableData);

  const fcfs = results.find((r) => r.algorithm === "FCFS")!;
  const priorityAging = results.find((r) => r.algorithm === "PRIORITY_AGING")!;
  const mlq = results.find((r) => r.algorithm === "MULTILEVEL")!;
  const sjf = results.find((r) => r.algorithm === "SJF")!;

  console.log("\nKey Viva Talking Points / Punchlines:");
  console.log(
    `1. FCFS (Baseline): Average wait was ${fcfs.metrics.avgWaitMs}ms. Can cause high wait times for late-arriving emergencies due to head-of-line blocking.`
  );
  console.log(
    `2. Priority + Aging: Average HIGH wait was ${priorityAging.metrics.highPriorityAvgWaitMs}ms. Starvation of LOW priority is prevented via dynamic wait-time priority boosting.`
  );
  console.log(
    `3. Multilevel Queue: Average HIGH wait was ${mlq.metrics.highPriorityAvgWaitMs}ms. Strict class separation ensures HIGH priority is handled first, while starvation guard (limit 3) prevents LOW from starving.`
  );
  console.log(
    `4. Shortest Job First: Average wait was ${sjf.metrics.avgWaitMs}ms. Provably optimal for average wait time, but can increase max wait times for longer HIGH priority cases.`
  );
}

main().catch((err) => {
  console.error("Benchmarking failed:", err);
  process.exit(1);
});

