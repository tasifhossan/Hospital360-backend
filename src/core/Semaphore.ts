/**
 * Semaphore.ts
 *
 * A classic counting semaphore, implemented from scratch (no library)
 * so the OS-concept mapping is explicit and demoable in a viva:
 *
 *   wait(S)/P(S)   -> acquire()
 *   signal(S)/V(S) -> release()
 *
 * Internally it keeps:
 *   - `count`   : number of currently available instances (like free frames)
 *   - `waiters` : a FIFO queue of blocked callers (the "waiting queue"
 *                 analogue from process scheduling - callers are resumed
 *                 in arrival order, i.e. FCFS at the semaphore level).
 *
 * Every acquire() that can't be satisfied immediately returns a Promise
 * that only resolves once release() hands it a slot - this is exactly
 * how a process blocks on a semaphore and gets woken by the scheduler.
 */

type Waiter = {
  resolve: () => void;
  requestedAt: number;
};

export class Semaphore {
  private count: number;
  private readonly capacity: number;
  private readonly waiters: Waiter[] = [];
  private readonly name: string;

  constructor(name: string, capacity: number) {
    if (capacity < 1) {
      throw new Error(`Semaphore "${name}" must have capacity >= 1`);
    }
    this.name = name;
    this.capacity = capacity;
    this.count = capacity;
  }

  /** Number of free instances right now. */
  available(): number {
    return this.count;
  }

  /** Number of instances currently held (in use). */
  inUse(): number {
    return this.capacity - this.count;
  }

  /** Number of callers currently blocked waiting for this resource. */
  queueLength(): number {
    return this.waiters.length;
  }

  /**
   * P(S) / wait(S): acquire one instance of the resource.
   * Resolves immediately if available, otherwise blocks (queues) until
   * a release() frees a slot for this specific waiter (FIFO order).
   */
  acquire(): Promise<void> {
    if (this.count > 0) {
      this.count -= 1;
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this.waiters.push({ resolve, requestedAt: Date.now() });
    });
  }

  /**
   * V(S) / signal(S): release one instance of the resource.
   * If someone is waiting, hand the slot directly to the oldest waiter
   * (avoids a lost-wakeup race and keeps FIFO fairness) instead of
   * incrementing count and letting them re-check.
   */
  release(): void {
    const next = this.waiters.shift();
    if (next) {
      // Hand the freed slot straight to the longest-waiting caller.
      next.resolve();
      return;
    }
    if (this.count < this.capacity) {
      this.count += 1;
    } else {
      throw new Error(
        `Semaphore "${this.name}" released more instances than its capacity (${this.capacity})`
      );
    }
  }

  /**
   * Safely increases the capacity of the semaphore.
   * Internal cast is used to mutate the readonly property.
   */
  increaseCapacity(by: number): void {
    if (by <= 0) return;
    (this as unknown as { capacity: number }).capacity += by;
  }

  status() {
    return {
      name: this.name,
      capacity: this.capacity,
      available: this.count,
      inUse: this.inUse(),
      waitingQueueLength: this.waiters.length,
    };
  }
}
