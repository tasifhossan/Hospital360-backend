import { describe, it, expect } from "vitest";
import { ResourceManager } from "./ResourceManager";
import { ResourceType } from "../types/resources";

describe("ResourceManager", () => {
  const customCapacities: Record<ResourceType, number> = {
    doctor: 2,
    icuBed: 1,
    nurse: 2,
    ventilator: 1,
    operationTheatre: 1,
    mriMachine: 1,
    ambulance: 1,
  };

  it("should track allocations and active holders", async () => {
    const rm = new ResourceManager(customCapacities);

    // PatientA acquires doctor
    await rm.acquire("doctor", "PatientA");
    expect(rm.getHolders("doctor")).toContain("PatientA");
    expect(rm.getHeldResources("PatientA")).toContain("doctor");

    // PatientA releases doctor
    rm.release("doctor", "PatientA");
    expect(rm.getHolders("doctor")).not.toContain("PatientA");
    expect(rm.getHeldResources("PatientA")).not.toContain("doctor");
  });

  it("should release all resources held by a holder", async () => {
    const rm = new ResourceManager(customCapacities);

    await rm.acquire("doctor", "PatientA");
    await rm.acquire("nurse", "PatientA");

    expect(rm.getHeldResources("PatientA")).toEqual(
      expect.arrayContaining(["doctor", "nurse"])
    );

    rm.releaseAll("PatientA");
    expect(rm.getHeldResources("PatientA")).toEqual([]);
    expect(rm.getHolders("doctor")).not.toContain("PatientA");
    expect(rm.getHolders("nurse")).not.toContain("PatientA");
  });

  it("should enforce all-or-nothing allocation logic", async () => {
    const rm = new ResourceManager(customCapacities);

    // Helper implementing the all-or-nothing allocation pattern from the simulation.
    // If any requested resource is unavailable (available count < requested),
    // we allocate nothing to avoid partial allocation deadlocks.
    const attemptAllOrNothingAllocation = async (
      holderId: string,
      resources: ResourceType[]
    ): Promise<boolean> => {
      const status = rm.getStatus();

      // Count requested resources
      const requested: Partial<Record<ResourceType, number>> = {};
      for (const res of resources) {
        requested[res] = (requested[res] ?? 0) + 1;
      }

      // Check if all requested resources are available
      for (const res of Object.keys(requested) as ResourceType[]) {
        const available = status[res]?.available ?? 0;
        if (available < (requested[res] ?? 0)) {
          return false; // Cannot allocate all -> allocate nothing
        }
      }

      // Allocate all since they are all available
      await Promise.all(resources.map((res) => rm.acquire(res, holderId)));
      return true;
    };

    // Scenario: PatientA needs a doctor and an icuBed. Both are available.
    const successA = await attemptAllOrNothingAllocation("PatientA", ["doctor", "icuBed"]);
    expect(successA).toBe(true);
    expect(rm.getHeldResources("PatientA")).toEqual(
      expect.arrayContaining(["doctor", "icuBed"])
    );

    // Scenario: PatientB needs a doctor and an icuBed. doctor is available (1 left), but icuBed is not (0 left).
    // All-or-nothing ensures PatientB gets NOTHING, preventing them from holding the doctor.
    const successB = await attemptAllOrNothingAllocation("PatientB", ["doctor", "icuBed"]);
    expect(successB).toBe(false);
    expect(rm.getHeldResources("PatientB")).toEqual([]);
    expect(rm.getHolders("doctor")).not.toContain("PatientB");
  });
});
