import { describe, it, expect } from "vitest";
import { ResourceManager } from "./ResourceManager";
import { DeadlockDetector } from "./DeadlockDetector";
import { ResourceType } from "../types/resources";

describe("DeadlockDetector", () => {
  const customCapacities: Record<ResourceType, number> = {
    doctor: 1,
    icuBed: 1,
    nurse: 1,
    ventilator: 1,
    operationTheatre: 1,
    mriMachine: 1,
    ambulance: 1,
  };

  it("should detect no deadlock when there are no cycles", async () => {
    const rm = new ResourceManager(customCapacities);
    const detector = new DeadlockDetector(rm);

    // Patient A holds doctor, Patient B holds icuBed. Neither has pending requests.
    await rm.acquire("doctor", "PatientA");
    await rm.acquire("icuBed", "PatientB");

    const result = detector.detectDeadlock();
    expect(result.deadlocked).toBe(false);
    expect(result.cycle).toBeUndefined();
  });

  it("should detect a genuine deadlock cycle", async () => {
    const rm = new ResourceManager(customCapacities);
    const detector = new DeadlockDetector(rm);

    // 1. Patient A acquires doctor
    await rm.acquire("doctor", "PatientA");
    // 2. Patient B acquires icuBed
    await rm.acquire("icuBed", "PatientB");

    // 3. Patient A requests icuBed (blocked, because Patient B holds it)
    const pA = rm.acquire("icuBed", "PatientA");

    // 4. Patient B requests doctor (blocked, because Patient A holds it)
    const pB = rm.acquire("doctor", "PatientB");

    // Give microtasks a chance to run so pending requests register in ResourceManager
    await new Promise((resolve) => setTimeout(resolve, 10));

    const result = detector.detectDeadlock();
    expect(result.deadlocked).toBe(true);
    expect(result.cycle).toBeDefined();
    // The cycle should contain both PatientA and PatientB
    expect(result.cycle).toContain("PatientA");
    expect(result.cycle).toContain("PatientB");

    // Clean up/resolve the pending promises to avoid dangling requests
    // We can manually force release/cleanup in ResourceManager
    rm.releaseAll("PatientA");
    rm.releaseAll("PatientB");

    // Await the promises as they should now resolve/reject
    await Promise.all([pA, pB]).catch(() => {});
  });
});
