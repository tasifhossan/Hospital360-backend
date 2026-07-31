/**
 * SimulationClock.ts
 *
 * The central heartbeat/timer interrupt of the Hospital OS kernel.
 * Coordinates patient arrivals, scheduling queue insertion, dispatching,
 * resource allocation, and treatment completion.
 *
 * OS Analogue:
 * - SimulationClock = Timer Interrupt / Scheduler Dispatch Loop.
 *   In a real OS, a hardware timer interrupt fires periodically, giving the kernel
 *   control to update system time, decrement process time slices, check for I/O
 *   completions, and run the scheduler dispatcher.
 * - All-or-Nothing Allocation = Deadlock Prevention (mutual exclusion handling).
 *   To avoid deadlock (where Patient A holds resource X and blocks waiting for Y,
 *   while Patient B holds Y and blocks waiting for X), we enforce all-or-nothing
 *   allocation. If a patient cannot get ALL their required resources, they wait
 *   in the queue without holding any.
 */

import { ResourceManager } from "./ResourceManager";
import { Scheduler } from "./schedulers/Scheduler";
import { PatientGenerator } from "./PatientGenerator";
import { Patient } from "../types/patient";
import { ResourceType } from "../types/resources";

export interface SimulationClockConfig {
  /** Real-time interval between ticks in milliseconds (default: 500ms) */
  tickIntervalMs?: number;
  /** How much simulated time (in ms) passes during each real-world tick (default: 1000ms) */
  simulatedMsPerTick?: number;
}

export type ClockCallback = (state: {
  simulatedTime: number;
  queue: Patient[];
  activeTreatments: Patient[];
  completedCount: number;
  stats: any;
}) => void;

export class SimulationClock {
  private resourceManager: ResourceManager;
  private scheduler: Scheduler;
  private readonly generator: PatientGenerator;

  private tickIntervalMs: number;
  private simulatedMsPerTick: number;

  private simulatedTime = 0;
  private intervalId: NodeJS.Timeout | null = null;

  // Queues and Lists
  private arrivalSchedule: Patient[] = [];
  private activeTreatments: Patient[] = [];
  private completedPatients: Patient[] = [];

  // Callbacks
  private readonly callbacks: ClockCallback[] = [];
  private readonly eventCallbacks: ((event: string, data: any) => void)[] = [];

  // Stats Tracking
  private totalWaitTimeMs = 0;
  private startedPatientsCount = 0;
  private queueLengthHistory: { simulatedTime: number; length: number }[] = [];

  constructor(
    resourceManager: ResourceManager,
    scheduler: Scheduler,
    generator: PatientGenerator,
    config: SimulationClockConfig = {}
  ) {
    this.resourceManager = resourceManager;
    this.scheduler = scheduler;
    this.generator = generator;
    this.tickIntervalMs = config.tickIntervalMs ?? 500;
    this.simulatedMsPerTick = config.simulatedMsPerTick ?? 1000;
  }

  /**
   * Subscribe to state updates on every tick.
   * Useful for UI socket updates or logging.
   */
  onTick(callback: ClockCallback): void {
    this.callbacks.push(callback);
  }

  /**
   * Subscribe to discrete events like patient arrival or completion.
   */
  onEvent(callback: (event: string, data: any) => void): void {
    this.eventCallbacks.push(callback);
  }

  private emitEvent(event: string, data: any): void {
    this.eventCallbacks.forEach((cb) => cb(event, data));
  }

  setScheduler(scheduler: Scheduler): void {
    this.scheduler = scheduler;
  }

  setResourceManager(resourceManager: ResourceManager): void {
    this.resourceManager = resourceManager;
  }

  getScheduler(): Scheduler {
    return this.scheduler;
  }

  getResourceManager(): ResourceManager {
    return this.resourceManager;
  }

  getGenerator(): PatientGenerator {
    return this.generator;
  }

  /** Starts the tick loop */
  start(): void {
    if (this.intervalId) return;

    this.intervalId = setInterval(() => {
      this.tick();
    }, this.tickIntervalMs);
  }

  /** Stops the tick loop */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /** Resets the simulation clock state */
  reset(): void {
    this.stop();
    this.simulatedTime = 0;
    this.arrivalSchedule = [];
    this.activeTreatments = [];
    this.completedPatients = [];
    this.totalWaitTimeMs = 0;
    this.startedPatientsCount = 0;
    this.queueLengthHistory = [];
  }

  getSimulatedTime(): number {
    return this.simulatedTime;
  }

  isRunning(): boolean {
    return this.intervalId !== null;
  }

  getStats() {
    return {
      simulatedTime: this.simulatedTime,
      totalPatientsServed: this.completedPatients.length,
      activePatientsCount: this.activeTreatments.length,
      waitingPatientsCount: this.scheduler.queueLength(),
      averageWaitTimeMs:
        this.startedPatientsCount > 0
          ? Math.round(this.totalWaitTimeMs / this.startedPatientsCount)
          : 0,
      queueLengthHistory: [...this.queueLengthHistory],
    };
  }

  /**
   * Main simulation tick execution.
   */
  private async tick(): Promise<void> {
    // 1. Advance simulated time
    this.simulatedTime += this.simulatedMsPerTick;

    // 2. Replenish and process upcoming patient arrivals
    this.replenishArrivalSchedule();
    while (
      this.arrivalSchedule.length > 0 &&
      this.arrivalSchedule[0].arrivalTime <= this.simulatedTime
    ) {
      const patient = this.arrivalSchedule.shift()!;
      patient.status = "WAITING";
      patient.queuedAt = this.simulatedTime;
      this.scheduler.enqueue(patient);
      this.emitEvent("patient:arrived", patient);
    }

    // 3. Process completed treatments
    const completedThisTick: Patient[] = [];
    this.activeTreatments = this.activeTreatments.filter((patient) => {
      const endTime = (patient.treatmentStartedAt ?? 0) + patient.treatmentDurationMs;
      if (this.simulatedTime >= endTime) {
        patient.status = "COMPLETED";
        patient.completedAt = this.simulatedTime;
        
        // Release all held resources back to the pool (V operation)
        this.resourceManager.releaseAll(patient.id);
        
        this.completedPatients.push(patient);
        completedThisTick.push(patient);
        this.emitEvent("patient:completed", patient);
        return false;
      }
      return true;
    });

    // 4. Dispatcher loop: attempt to schedule the next ready patient
    // In FCFS, we check if the head of the queue can acquire resources.
    // If it cannot, it blocks all subsequent scheduling (HOL Blocking).
    let scheduling = true;
    while (scheduling) {
      scheduling = false;
      const nextPatient = this.scheduler.peekQueue()[0];

      if (nextPatient) {
        if (this.canAllocate(nextPatient.requiredResources)) {
          // Dequeue patient now that we are sure we can satisfy their resource requests
          const patient = this.scheduler.next()!;
          patient.status = "IN_TREATMENT";
          patient.treatmentStartedAt = this.simulatedTime;

          // Track stats
          const waitTime = patient.treatmentStartedAt - patient.arrivalTime;
          this.totalWaitTimeMs += waitTime;
          this.startedPatientsCount += 1;

          // Synchronously allocate all required resources (P operations)
          await Promise.all(
            patient.requiredResources.map((res) =>
              this.resourceManager.acquire(res, patient.id)
            )
          );

          this.activeTreatments.push(patient);
          this.emitEvent("patient:treatmentStarted", patient);
          scheduling = true; // Attempt to schedule the next process in the queue
        } else {
          // Head-Of-Line Blocking: FCFS scheduler cannot bypass a blocked patient
          // to serve others, even if the resources for subsequent patients are free.
          scheduling = false;
        }
      }
    }

    // Record queue length history
    this.queueLengthHistory.push({
      simulatedTime: this.simulatedTime,
      length: this.scheduler.queueLength(),
    });

    // Limit history length to prevent memory leak
    if (this.queueLengthHistory.length > 200) {
      this.queueLengthHistory.shift();
    }

    // 5. Notify subscribers
    const state = {
      simulatedTime: this.simulatedTime,
      queue: this.scheduler.peekQueue(),
      activeTreatments: [...this.activeTreatments],
      completedCount: this.completedPatients.length,
      stats: this.getStats(),
    };

    this.callbacks.forEach((cb) => cb(state));
  }

  /**
   * Replenishes the arrival schedule if it falls below a threshold,
   * allowing the generator stream to run indefinitely.
   */
  private replenishArrivalSchedule(): void {
    const minBuffer = 5;
    const batchSize = 10;

    if (this.arrivalSchedule.length < minBuffer) {
      const lastPatient = this.arrivalSchedule[this.arrivalSchedule.length - 1];
      const startFrom = lastPatient ? lastPatient.arrivalTime : this.simulatedTime;
      const nextBatch = this.generator.generateBatch(batchSize, startFrom);
      this.arrivalSchedule.push(...nextBatch);
    }
  }

  /**
   * Checks if all requested resource types are currently available.
   * Ensures all-or-nothing allocation (mutual exclusion deadlock prevention).
   */
  private canAllocate(resources: ResourceType[]): boolean {
    const status = this.resourceManager.getStatus();
    
    // Count requested counts for each resource type
    const requestedCounts: Partial<Record<ResourceType, number>> = {};
    for (const res of resources) {
      requestedCounts[res] = (requestedCounts[res] ?? 0) + 1;
    }

    // Verify each requested count is available
    for (const res of Object.keys(requestedCounts) as ResourceType[]) {
      const available = status[res]?.available ?? 0;
      const requested = requestedCounts[res] ?? 0;
      if (available < requested) {
        return false;
      }
    }

    return true;
  }
}
