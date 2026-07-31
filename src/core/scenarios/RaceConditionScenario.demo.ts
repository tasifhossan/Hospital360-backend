/**
 * RaceConditionScenario.demo.ts
 *
 * Demonstrates a "check-then-act" race condition when allocating resources
 * without synchronization primitives (UNSAFE mode), and its resolution using
 * atomic semaphores (SAFE mode).
 *
 * OS Concepts:
 * - Race Condition:
 *   Occurs when multiple processes/threads access and manipulate shared data
 *   concurrently, and the outcome depends on the particular order of execution.
 * - Non-Atomicity (Check-Then-Act):
 *   A race condition happens when a sequence of operations (e.g., checking if
 *   a resource is available, then decrementing its count) is not executed as
 *   a single, atomic transaction. If a thread yields control (e.g., context
 *   switch / async `await` delay) after checking but before acting, other threads
 *   can interleave, leading to invalid states (like double-booking a bed).
 * - Mutual Exclusion (Mutex/Semaphore):
 *   Enforces that only one thread can execute a critical section at any time,
 *   making the check-and-act operations behave atomically.
 */

import { Semaphore } from "../Semaphore";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Parse mode from command line arguments
const args = process.argv.slice(2);
const isSafe = args.some((arg) => arg.includes("--mode=safe"));
const modeName = isSafe ? "SAFE (Semaphore Mutual Exclusion)" : "UNSAFE (Non-Atomic Check-Then-Act)";

class UnsafeResourcePool {
  readonly name: string;
  readonly capacity: number;
  private availableCount: number;
  private activeHolders = 0;

  constructor(name: string, capacity: number) {
    this.name = name;
    this.capacity = capacity;
    this.availableCount = capacity;
  }

  async acquire(holderId: string): Promise<void> {
    console.log(`[${holderId}] Checking if "${this.name}" is available... (Available: ${this.availableCount})`);
    
    // Check
    if (this.availableCount > 0) {
      console.log(`[${holderId}] resource is available. Preparing to allocate...`);
      
      // Artificial context switch delay.
      // This yields execution control back to the Node event loop, allowing other
      // concurrent checks to run before any thread decrements the count.
      await sleep(50);

      // Act
      this.availableCount -= 1;
      this.activeHolders += 1;

      console.log(`[${holderId}] 🟢 ALLOCATED "${this.name}". (In-Use: ${this.activeHolders}/${this.capacity})`);

      // Invariant validation
      if (this.activeHolders > this.capacity) {
        console.log(
          `🚨 [CRITICAL VIOLATION] Double booking detected on "${this.name}"! ` +
          `Active Holders: ${this.activeHolders}, Capacity: ${this.capacity}`
        );
      }
    } else {
      console.log(`[${holderId}] ❌ Allocation failed: no free "${this.name}" available.`);
    }
  }

  release(holderId: string) {
    if (this.activeHolders > 0) {
      this.activeHolders -= 1;
      this.availableCount += 1;
      console.log(`[${holderId}] Released "${this.name}". (In-Use: ${this.activeHolders}/${this.capacity})`);
    }
  }
}

async function runUnsafeScenario() {
  console.log("\n--- Starting UNSAFE Race Condition Scenario ---");
  console.log("Creating UnsafeResourcePool for operationTheatre (Capacity: 2).");
  console.log("10 Doctors will attempt to acquire it concurrently without synchronization.\n");

  const pool = new UnsafeResourcePool("operationTheatre", 2);

  // Trigger 10 concurrent requests
  const doctorRequests = Array.from({ length: 10 }, (_, i) => {
    const docId = `Dr.${String.fromCharCode(65 + i)}`; // Dr.A, Dr.B, etc.
    return (async () => {
      await pool.acquire(docId);
      await sleep(200); // Simulate short surgery
      pool.release(docId);
    })();
  });

  await Promise.all(doctorRequests);
  console.log("\n=== UNSAFE Race Condition Demo Completed ===");
}

async function runSafeScenario() {
  console.log("\n--- Starting SAFE Race Condition Scenario ---");
  console.log("Using real atomic Semaphore for operationTheatre (Capacity: 2).");
  console.log("10 Doctors will attempt to acquire it concurrently.\n");

  const sem = new Semaphore("operationTheatre", 2);
  let activeHolders = 0;

  const requestResource = async (holderId: string) => {
    console.log(`[${holderId}] Requesting operationTheatre...`);
    
    // Acquire blocks safely in FIFO order if capacity is reached
    await sem.acquire();
    activeHolders += 1;
    console.log(`[${holderId}] 🟢 ACQUIRED operationTheatre. (In-Use: ${activeHolders}/2)`);

    // Invariant check: In-use count must never exceed 2
    if (activeHolders > 2) {
      console.log(`🚨 [CRITICAL VIOLATION] Double booking on operationTheatre!`);
    }

    // Simulate surgery
    await sleep(200);

    activeHolders -= 1;
    console.log(`[${holderId}] Released operationTheatre. (In-Use: ${activeHolders}/2)`);
    sem.release();
  };

  const doctorRequests = Array.from({ length: 10 }, (_, i) => {
    const docId = `Dr.${String.fromCharCode(65 + i)}`;
    return requestResource(docId);
  });

  await Promise.all(doctorRequests);
  console.log("\n=== SAFE Race Condition Demo Completed ===");
}

async function main() {
  console.log(`=== Running Race Condition Demo in ${modeName} Mode ===`);

  if (isSafe) {
    await runSafeScenario();
  } else {
    await runUnsafeScenario();
  }
}

main().catch((err) => {
  console.error("Scenario execution failed:", err);
  process.exit(1);
});
