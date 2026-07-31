/**
 * ResourceManager.demo.ts
 *
 * Run with: npm run demo:resourcemanager
 *
 * Proves the core Phase-1 requirement: when more requesters ask for a
 * resource than exist, the extras block (queue) instead of erroring or
 * double-allocating, and are served in FIFO order once a slot frees up.
 *
 * Scenario: only 2 operation theatres, but 5 "doctors" try to grab one
 * at the same simulated instant.
 */

import { ResourceManager } from "./ResourceManager";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function simulateSurgery(
  rm: ResourceManager,
  doctorId: string,
  surgeryDurationMs: number
) {
  const requestedAt = Date.now();
  console.log(`[${doctorId}] requests an operationTheatre`);

  await rm.acquire("operationTheatre", doctorId);
  const waited = Date.now() - requestedAt;
  console.log(
    `[${doctorId}] ACQUIRED operationTheatre after waiting ${waited}ms - starting surgery`
  );

  await sleep(surgeryDurationMs);

  rm.release("operationTheatre", doctorId);
  console.log(`[${doctorId}] released operationTheatre - surgery complete`);
}

async function main() {
  // Deliberately small capacity so contention is visible in the log.
  const rm = new ResourceManager({
    doctor: 20,
    nurse: 15,
    icuBed: 10,
    ventilator: 8,
    operationTheatre: 2, // <- only 2, but 5 doctors will compete below
    mriMachine: 6,
    ambulance: 4,
  });

  console.log("Initial status:", rm.getStatus().operationTheatre);
  console.log("--- 5 doctors requesting 2 operation theatres at once ---\n");

  await Promise.all([
    simulateSurgery(rm, "Dr.A", 1500),
    simulateSurgery(rm, "Dr.B", 1000),
    simulateSurgery(rm, "Dr.C", 800),
    simulateSurgery(rm, "Dr.D", 1200),
    simulateSurgery(rm, "Dr.E", 900),
  ]);

  console.log("\nFinal status:", rm.getStatus().operationTheatre);
}

main().catch((err) => {
  console.error("Demo failed:", err);
  process.exit(1);
});
