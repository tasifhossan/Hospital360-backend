/**
 * PatientGenerator.ts
 *
 * A helper class that generates Patient records (processes) either one-shot
 * or as a scheduled stream.
 *
 * OS Analogue:
 * - PatientGenerator = Arrival Process / Workload Generator.
 *   In real OS research and queueing theory, processes do not arrive in a simple
 *   flat sequence; they arrive dynamically. The exponential inter-arrival
 *   distribution (Poisson process) is the classic model used to simulate
 *   realistic, unpredictable traffic (e.g. packets arriving at a network card,
 *   or tasks submitted to a server).
 * - Priority Distribution: Maps to varying task types (e.g. system tasks vs.
 *   interactive tasks vs. background batch tasks), each requesting different
 *   resources and runtimes.
 */

import { Patient } from "../types/patient";
import { Priority, ResourceType } from "../types/resources";

export type ArrivalMode = "UNIFORM" | "POISSON";

export interface PatientGeneratorConfig {
  arrivalMode: ArrivalMode;
  avgArrivalsPerMinute: number;
}

// Names list for readability of console outputs and dashboard
const RANDOM_NAMES = [
  "Liam", "Olivia", "Noah", "Emma", "Oliver", "Ava", "Elijah", "Charlotte",
  "William", "Sophia", "James", "Amelia", "Benjamin", "Isabella", "Lucas",
  "Mia", "Henry", "Evelyn", "Alexander", "Harper", "Mason", "Camila"
];

// Lookup table of priority-based resource demands and treatment durations (in ms)
interface PriorityProfile {
  resourceOptions: ResourceType[][];
  minDurationMs: number;
  maxDurationMs: number;
}

const PRIORITY_PROFILES: Record<Priority, PriorityProfile> = {
  HIGH: {
    // High-priority (emergencies): Needs intensive/multiple resources
    resourceOptions: [
      ["doctor", "operationTheatre", "nurse"],
      ["doctor", "icuBed", "ventilator", "nurse"],
    ],
    minDurationMs: 3000,
    maxDurationMs: 5000,
  },
  MEDIUM: {
    // Medium-priority: Needs diagnostic or moderate monitoring
    resourceOptions: [
      ["doctor", "nurse", "mriMachine"],
      ["doctor", "icuBed"],
    ],
    minDurationMs: 1500,
    maxDurationMs: 2500,
  },
  LOW: {
    // Low-priority: Routine checkups, minor treatments
    resourceOptions: [
      ["doctor"],
      ["nurse"],
      ["doctor", "nurse"],
    ],
    minDurationMs: 500,
    maxDurationMs: 1000,
  },
};

export class PatientGenerator {
  private config: PatientGeneratorConfig;
  private patientCounter = 0;

  constructor(config: PatientGeneratorConfig) {
    this.config = config;
  }

  /**
   * Generates a single patient record at the given simulated arrival time.
   */
  generateOne(arrivalTime: number): Patient {
    this.patientCounter += 1;
    const id = `P-${this.patientCounter}`;
    const name = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
    
    // Priority assignment distribution: HIGH 15%, MEDIUM 35%, LOW 50%
    const r = Math.random();
    let priority: Priority = "LOW";
    if (r < 0.15) {
      priority = "HIGH";
    } else if (r < 0.50) {
      priority = "MEDIUM";
    }

    const profile = PRIORITY_PROFILES[priority];
    
    // Randomly select one of the resource requirement lists
    const requiredResources = [
      ...profile.resourceOptions[Math.floor(Math.random() * profile.resourceOptions.length)]
    ];

    // Randomize treatment duration in range
    const treatmentDurationMs = Math.floor(
      profile.minDurationMs + Math.random() * (profile.maxDurationMs - profile.minDurationMs)
    );

    return {
      id,
      name,
      priority,
      arrivalTime,
      requiredResources,
      treatmentDurationMs,
      status: "WAITING",
    };
  }

  /**
   * Generates a list of N patients with sequence-calculated arrival times.
   * Useful to pre-populate a timeline/schedule of upcoming arrivals.
   */
  generateBatch(n: number, startTime: number): Patient[] {
    const patients: Patient[] = [];
    let currentArrival = startTime;

    for (let i = 0; i < n; i++) {
      const interArrival = this.nextInterArrivalTime();
      currentArrival += interArrival;
      patients.push(this.generateOne(currentArrival));
    }

    return patients;
  }

  /**
   * Helper to compute inter-arrival time in milliseconds based on configuration.
   */
  private nextInterArrivalTime(): number {
    const meanInterArrivalMs = 60000 / this.config.avgArrivalsPerMinute;

    if (this.config.arrivalMode === "POISSON") {
      // Exponential distribution: -ln(1 - U) * mean
      // We use 1 - Math.random() to avoid ln(0) since Math.random() is [0, 1)
      const u = 1 - Math.random();
      return Math.round(-Math.log(u) * meanInterArrivalMs);
    } else {
      // Uniform random distribution in range [0, 2 * mean]
      return Math.round(Math.random() * 2 * meanInterArrivalMs);
    }
  }
}
