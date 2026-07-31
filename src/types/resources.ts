/**
 * resources.ts
 *
 * Defines every "resource" the hospital OS manages, and their capacities.
 * This is the direct analogue of a real OS's resource table
 * (e.g. how many instances of each resource type exist, like the
 * Resource-Allocation Graph / Banker's Algorithm resource vector).
 */

export type ResourceType =
  | "doctor"        // CPU core
  | "nurse"         // CPU core (secondary pool)
  | "icuBed"        // Memory frame
  | "ventilator"    // I/O device
  | "operationTheatre" // Shared exclusive-use resource
  | "mriMachine"    // I/O device
  | "ambulance";    // Device

/**
 * Total capacity of each resource, mirroring how an OS knows the total
 * number of instances of each resource type at boot time.
 */
export const RESOURCE_CAPACITY: Record<ResourceType, number> = {
  doctor: 20,
  nurse: 15,
  icuBed: 10,
  ventilator: 8,
  operationTheatre: 5,
  mriMachine: 6,
  ambulance: 4,
};

export type Priority = "HIGH" | "MEDIUM" | "LOW";

/**
 * Base wait-time (ms) added per aging tick, used later by the
 * Priority + Aging scheduler (Phase 3) to prevent starvation.
 */
export const PRIORITY_WEIGHT: Record<Priority, number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
};
