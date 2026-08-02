import { describe, it, expect } from "vitest";
import { Semaphore } from "./Semaphore";

describe("Semaphore", () => {
  it("should initialize with correct capacity and count", () => {
    const sem = new Semaphore("test-sem", 3);
    expect(sem.available()).toBe(3);
    expect(sem.inUse()).toBe(0);
    expect(sem.queueLength()).toBe(0);
  });

  it("should acquire resources synchronously when available", async () => {
    const sem = new Semaphore("test-sem", 2);
    
    await sem.acquire();
    expect(sem.available()).toBe(1);
    expect(sem.inUse()).toBe(1);

    await sem.acquire();
    expect(sem.available()).toBe(0);
    expect(sem.inUse()).toBe(2);
  });

  it("should block acquire calls when count is 0 and release them in FIFO order", async () => {
    const sem = new Semaphore("test-sem", 1);
    
    // Acquire the only slot
    await sem.acquire();
    
    const order: number[] = [];
    const p1 = sem.acquire().then(() => {
      order.push(1);
    });
    const p2 = sem.acquire().then(() => {
      order.push(2);
    });
    const p3 = sem.acquire().then(() => {
      order.push(3);
    });

    expect(sem.queueLength()).toBe(3);

    // Release first slot. This should wake p1.
    sem.release();
    await p1;
    expect(order).toEqual([1]);
    expect(sem.queueLength()).toBe(2);

    // Release second slot. This should wake p2.
    sem.release();
    await p2;
    expect(order).toEqual([1, 2]);
    expect(sem.queueLength()).toBe(1);

    // Release third slot. This should wake p3.
    sem.release();
    await p3;
    expect(order).toEqual([1, 2, 3]);
    expect(sem.queueLength()).toBe(0);
  });

  it("should increase capacity correctly via increaseCapacity", () => {
    const sem = new Semaphore("test-sem", 2);
    expect(sem.status().capacity).toBe(2);
    
    sem.increaseCapacity(3);
    expect(sem.status().capacity).toBe(5);
    for (let i = 0; i < 3; i++) {
      sem.release();
    }
    expect(sem.available()).toBe(5);
  });

  it("should throw error if released beyond capacity", () => {
    const sem = new Semaphore("test-sem", 2);
    expect(() => sem.release()).toThrow("released more instances than its capacity");
  });
});
