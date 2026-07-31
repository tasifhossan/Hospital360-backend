/**
 * ResourceManager.ts
 *
 * The hospital's "kernel resource table". Wraps one Semaphore per
 * ResourceType and adds an allocation ledger so we know *who* holds
 * *what* at any moment - this ledger is what Phase 4's deadlock
 * detector (cycle detection over the Resource-Allocation Graph) will
 * read from, so it's built in from day one rather than bolted on.
 */

import { Semaphore } from "./Semaphore";
import { ResourceType, RESOURCE_CAPACITY } from "../types/resources";

export interface AllocationRecord {
  holderId: string;      // e.g. patientId or doctorId requesting the resource
  resource: ResourceType;
  acquiredAt: number;
}

export class ResourceManager {
  private readonly pools: Map<ResourceType, Semaphore> = new Map();

  // Ledger: resource -> set of holderIds currently holding an instance.
  private readonly allocations: Map<ResourceType, Set<string>> = new Map();

  // Reverse index: holderId -> resources it currently holds.
  // Useful for "release everything this patient/doctor was holding".
  private readonly holderIndex: Map<string, Set<ResourceType>> = new Map();

  constructor(
    capacities: Record<ResourceType, number> = RESOURCE_CAPACITY
  ) {
    (Object.keys(capacities) as ResourceType[]).forEach((type) => {
      this.pools.set(type, new Semaphore(type, capacities[type]));
      this.allocations.set(type, new Set());
    });
  }

  private getPool(type: ResourceType): Semaphore {
    const pool = this.pools.get(type);
    if (!pool) throw new Error(`Unknown resource type: ${type}`);
    return pool;
  }

  /**
   * Acquire one instance of `resource` on behalf of `holderId`.
   * Blocks (awaits) if none are free - equivalent to a process
   * calling wait(S) on a busy semaphore and being descheduled until
   * signal(S) wakes it.
   */
  async acquire(resource: ResourceType, holderId: string): Promise<void> {
    const pool = this.getPool(resource);
    await pool.acquire();

    this.allocations.get(resource)!.add(holderId);
    if (!this.holderIndex.has(holderId)) {
      this.holderIndex.set(holderId, new Set());
    }
    this.holderIndex.get(holderId)!.add(resource);
  }

  /**
   * Release one instance of `resource` previously held by `holderId`.
   */
  release(resource: ResourceType, holderId: string): void {
    const holders = this.allocations.get(resource);
    if (!holders || !holders.has(holderId)) {
      throw new Error(
        `Cannot release "${resource}": holder "${holderId}" does not currently hold it`
      );
    }
    holders.delete(holderId);
    this.holderIndex.get(holderId)?.delete(resource);

    this.getPool(resource).release();
  }

  /** Release every resource currently held by holderId (e.g. patient discharged). */
  releaseAll(holderId: string): void {
    const held = this.holderIndex.get(holderId);
    if (!held) return;
    // copy to array first since release() mutates the set we're iterating
    Array.from(held).forEach((resource) => this.release(resource, holderId));
  }

  /** Live snapshot of every resource pool - what the dashboard polls/streams. */
  getStatus() {
    const status: Record<string, ReturnType<Semaphore["status"]>> = {};
    this.pools.forEach((pool, type) => {
      status[type] = pool.status();
    });
    return status;
  }

  /** Who is currently holding a given resource (for the admin/deadlock view). */
  getHolders(resource: ResourceType): string[] {
    return Array.from(this.allocations.get(resource) ?? []);
  }

  /** What resources a given holder currently has (for deadlock cycle detection). */
  getHeldResources(holderId: string): ResourceType[] {
    return Array.from(this.holderIndex.get(holderId) ?? []);
  }
}
