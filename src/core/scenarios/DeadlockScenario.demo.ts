/**
 * DeadlockScenario.demo.ts
 *
 * Demonstrates a classic circular-wait deadlock (UNSAFE mode) and its prevention
 * via global resource ordering (SAFE mode).
 *
 * OS Concepts:
 * - Deadlock Conditions (Coffman Conditions):
 *   1. Mutual Exclusion (enforced by Semaphores)
 *   2. Hold and Wait (processes request new resources while holding existing ones)
 *   3. No Preemption (resources cannot be forcibly taken)
 *   4. Circular Wait (a closed chain of dependencies exists)
 * - Deadlock Prevention (Safe Mode):
 *   Eliminates the "Circular Wait" condition by enforcing a strict global ordering
 *   on resource acquisition (e.g. alphabetical resource lock ordering).
 * - Deadlock Detection & Recovery (Unsafe Mode):
 *   Lets the deadlock happen, detects it via the cycle detector, and recovers
 *   by forcibly preempting (releasing) a resource from one of the participants.
 */

import { ResourceManager } from "../ResourceManager";
import { DeadlockDetector } from "../DeadlockDetector";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Parse mode from command line arguments
const args = process.argv.slice(2);
const isSafe = args.some((arg) => arg.includes("--mode=safe"));
const modeName = isSafe ? "SAFE (Resource Ordering Prevention)" : "UNSAFE (Hold & Wait Circular Deadlock)";

async function runUnsafeScenario(rm: ResourceManager) {
  console.log("\n--- Starting UNSAFE Deadlock Scenario ---");
  console.log("Doctor A will try to acquire icuBed, then operationTheatre.");
  console.log("Doctor B will try to acquire operationTheatre, then icuBed.\n");

  const doctorA = async () => {
    console.log("[Doctor A] 📥 Requesting icuBed...");
    await rm.acquire("icuBed", "Doctor A");
    console.log("[Doctor A] 🟢 Acquired icuBed. Holding it and simulating preparation...");
    await sleep(800);

    console.log("[Doctor A] 📥 Requesting operationTheatre...");
    await rm.acquire("operationTheatre", "Doctor A");
    console.log("[Doctor A] 🎉 Acquired operationTheatre! Performing surgery...");
    await sleep(1000);

    rm.releaseAll("Doctor A");
    console.log("[Doctor A] ✅ Surgery complete. Released all resources.");
  };

  const doctorB = async () => {
    console.log("[Doctor B] 📥 Requesting operationTheatre...");
    await rm.acquire("operationTheatre", "Doctor B");
    console.log("[Doctor B] 🟢 Acquired operationTheatre. Holding it and simulating preparation...");
    await sleep(800);

    console.log("[Doctor B] 📥 Requesting icuBed...");
    await rm.acquire("icuBed", "Doctor B");
    console.log("[Doctor B] 🎉 Acquired icuBed! Performing surgery...");
    await sleep(1000);

    rm.releaseAll("Doctor B");
    console.log("[Doctor B] ✅ Surgery complete. Released all resources.");
  };

  // Start detector loop
  const detector = new DeadlockDetector(rm);
  const detectorInterval = setInterval(() => {
    const status = detector.detectDeadlock();
    if (status.deadlocked) {
      console.log(`\n🚨 [DEADLOCK DETECTOR] DEADLOCK DETECTED! Cycle: ${status.cycle?.join(" -> ")}`);
      console.log("🚨 [DEADLOCK DETECTOR] Recovery: Preempting 'operationTheatre' from 'Doctor B' to resolve cycle...");
      
      // Stop checking and recover by releasing B's OT resource
      clearInterval(detectorInterval);
      rm.release("operationTheatre", "Doctor B");
      console.log("🚨 [DEADLOCK DETECTOR] Resource released. Deadlock broken.\n");
    } else {
      console.log("[Detector] Checking for deadlock... No cycle found.");
    }
  }, 500);

  // Execute both concurrently
  await Promise.all([
    doctorA().catch((e) => console.log(`[Doctor A Error]: ${e.message}`)),
    doctorB().catch((e) => console.log(`[Doctor B Error]: ${e.message}`)),
  ]);

  clearInterval(detectorInterval);
  console.log("\n=== UNSAFE Deadlock Demo Completed ===");
}

async function runSafeScenario(rm: ResourceManager) {
  console.log("\n--- Starting SAFE Deadlock Scenario ---");
  console.log("Enforcing alphabetical global ordering: always icuBed before operationTheatre.\n");

  const doctorA = async () => {
    console.log("[Doctor A] 📥 Requesting icuBed (1st in order)...");
    await rm.acquire("icuBed", "Doctor A");
    console.log("[Doctor A] 🟢 Acquired icuBed. Preparing...");
    await sleep(1000);

    console.log("[Doctor A] 📥 Requesting operationTheatre (2nd in order)...");
    await rm.acquire("operationTheatre", "Doctor A");
    console.log("[Doctor A] 🎉 Acquired operationTheatre! Performing surgery...");
    await sleep(1000);

    rm.releaseAll("Doctor A");
    console.log("[Doctor A] ✅ Surgery complete. Released all resources.");
  };

  const doctorB = async () => {
    // Alphabetical order: Doctor B must lock icuBed before operationTheatre
    console.log("[Doctor B] 📥 Requesting icuBed (1st in order)...");
    await rm.acquire("icuBed", "Doctor B");
    console.log("[Doctor B] 🟢 Acquired icuBed. Preparing...");
    await sleep(1000);

    console.log("[Doctor B] 📥 Requesting operationTheatre (2nd in order)...");
    await rm.acquire("operationTheatre", "Doctor B");
    console.log("[Doctor B] 🎉 Acquired operationTheatre! Performing surgery...");
    await sleep(1000);

    rm.releaseAll("Doctor B");
    console.log("[Doctor B] ✅ Surgery complete. Released all resources.");
  };

  const detector = new DeadlockDetector(rm);
  const detectorInterval = setInterval(() => {
    const status = detector.detectDeadlock();
    console.log(`[Detector] Checking for deadlock... Deadlocked: ${status.deadlocked}`);
  }, 500);

  await Promise.all([doctorA(), doctorB()]);

  clearInterval(detectorInterval);
  console.log("\n=== SAFE Deadlock Demo Completed ===");
}

async function main() {
  console.log(`=== Running Deadlock Scenario Demo in ${modeName} Mode ===`);

  const rm = new ResourceManager({
    doctor: 2,
    nurse: 2,
    icuBed: 1,           // Capacity = 1 to enforce contention
    ventilator: 1,
    operationTheatre: 1, // Capacity = 1 to enforce contention
    mriMachine: 1,
    ambulance: 1,
  });

  if (isSafe) {
    await runSafeScenario(rm);
  } else {
    await runUnsafeScenario(rm);
  }
}

main().catch((err) => {
  console.error("Scenario execution failed:", err);
  process.exit(1);
});
