/**
 * SimulationClock.demo.ts
 *
 * Run with: npm run demo:simulation
 *
 * Proves the Phase-2 requirement: PatientGenerator, FcfsScheduler, ResourceManager,
 * and SimulationClock work end-to-end.
 *
 * Scenario:
 * - Extremely constrained resources (1 Operation Theatre, 1 ICU bed, 2 Doctors)
 * - Poisson arrivals of ~5 patients/minute
 * - Simulation runs for 20 ticks (10 real-world seconds, representing 20 simulated seconds)
 * - Logs each patient's journey: arrival, queueing, treatment start, and completion.
 */

import { ResourceManager } from "./ResourceManager";
import { FcfsScheduler } from "./schedulers/FcfsScheduler";
import { PatientGenerator } from "./PatientGenerator";
import { SimulationClock } from "./SimulationClock";
import { Patient } from "../types/patient";

async function main() {
  console.log("=== Starting Hospital OS Phase 2 Simulation Demo ===");
  console.log("Setting up resources (1 OT, 1 ICU Bed, 2 Doctors, 2 Nurses, etc.)...");

  const rm = new ResourceManager({
    doctor: 2,
    nurse: 2,
    icuBed: 1,
    ventilator: 1,
    operationTheatre: 1,
    mriMachine: 1,
    ambulance: 1,
  });

  const scheduler = new FcfsScheduler();

  const generator = new PatientGenerator({
    arrivalMode: "POISSON",
    avgArrivalsPerMinute: 60, // 60/min = 1 patient per simulated second (1000ms) on average
  });

  const clock = new SimulationClock(rm, scheduler, generator, {
    tickIntervalMs: 500,       // Ticks every 500ms in real-world time
    simulatedMsPerTick: 1000,   // Advances simulated time by 1000ms per tick (2x speedup)
  });

  // Track logged states to print clean, non-duplicate messages
  const loggedArrivals = new Set<string>();
  const loggedStarts = new Set<string>();
  const loggedCompletions = new Set<string>();

  // Store patient metadata locally for access during completion logging
  const patientDetails = new Map<string, Patient>();

  clock.onTick((state) => {
    const simTime = state.simulatedTime;

    // 1. Log arrivals
    // Check patients currently in the scheduler queue or active treatments
    const allKnownPatients = [...state.queue, ...state.activeTreatments];
    for (const patient of allKnownPatients) {
      if (!loggedArrivals.has(patient.id)) {
        loggedArrivals.add(patient.id);
        patientDetails.set(patient.id, patient);
        console.log(
          `[Sim Time: ${simTime}ms] 📥 ARRIVAL: ${patient.name} (${patient.id}) arrived.` +
          ` Priority: ${patient.priority} | Needs: [${patient.requiredResources.join(", ")}]` +
          ` | Est. Duration: ${patient.treatmentDurationMs}ms`
        );
      }
    }

    // 2. Log treatment starts
    for (const patient of state.activeTreatments) {
      if (!loggedStarts.has(patient.id)) {
        loggedStarts.add(patient.id);
        const waitTime = simTime - patient.arrivalTime;
        console.log(
          `[Sim Time: ${simTime}ms] ⚡ TREATMENT START: ${patient.name} (${patient.id}) allocated resources [${patient.requiredResources.join(", ")}] after waiting ${waitTime}ms.`
        );
      }
    }

    // 3. Log completions
    // Any patient that was started but is no longer in active treatments is completed
    for (const id of loggedStarts) {
      if (!state.activeTreatments.some((p) => p.id === id) && !loggedCompletions.has(id)) {
        loggedCompletions.add(id);
        const p = patientDetails.get(id);
        console.log(
          `[Sim Time: ${simTime}ms] ✅ COMPLETION: ${p?.name || id} (${id}) finished treatment. Released all resources.`
        );
      }
    }

    // 4. Log active queue status
    const queueList = state.queue.map((p) => `${p.id}(${p.priority})`).join(", ");
    console.log(
      `[Sim Time: ${simTime}ms] --- Queue: [${queueList || "empty"}] | Active: ${state.activeTreatments.length} | Completed: ${state.completedCount} ---`
    );
  endConsoleLog(state);
  });

  let tickCount = 0;
  const maxTicks = 25;

  function endConsoleLog(state: any) {
    tickCount++;
    if (tickCount >= maxTicks) {
      clock.stop();
      console.log("\n=== Simulation Demo Finished ===");
      const stats = clock.getStats();
      console.log(`Simulated Duration: ${stats.simulatedTime ?? clock.getSimulatedTime()}ms`);
      console.log(`Total Patients Fully Served: ${stats.totalPatientsServed}`);
      console.log(`Average Wait Time: ${stats.averageWaitTimeMs}ms`);
      console.log("Current Resource Status:", JSON.stringify(rm.getStatus(), null, 2));
      process.exit(0);
    }
  }

  console.log("Starting simulation clock...");
  clock.start();
}

main().catch((err) => {
  console.error("Simulation failed:", err);
  process.exit(1);
});
