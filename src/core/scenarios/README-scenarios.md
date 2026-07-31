# Concurrency Correctness Scenarios

This directory contains demos simulating two classic operating systems concurrency issues—**Deadlocks** and **Race Conditions**—within the Hospital OS simulation environment.

---

### Concept Summary Table

| Scenario | Root Cause | Prevention Technique | Detection Method | Recovery / Resolution |
| :--- | :--- | :--- | :--- | :--- |
| **Deadlock** | **Circular Wait** + **Hold & Wait**<br>Processes hold one resource while requesting another, forming a closed dependency cycle. | **Resource Ordering**<br>Force all processes to acquire resources in a strict, globally consistent sequence (e.g. alphabetical). | **Wait-For Graph (WFG) Cycles**<br>Execute a Depth-First Search (DFS) back-edge check over the active allocation and request ledger. | **Resource Preemption**<br>Forcibly release a held resource from one of the deadlocked holders to break the cycle. |
| **Race Condition** | **Non-Atomic Check-Then-Act**<br>Multiple concurrent requests yield control (`await`) after checking availability but before allocating. | **Mutual Exclusion**<br>Use an atomic counting semaphore to serialize check-and-act operations. | **Invariant Checking**<br>Monitor if the active holders count (`inUse`) exceeds the maximum resource `capacity`. | **Mutex / Semaphore Protection**<br>Block competing requests in a FIFO wait queue, ensuring capacity invariants are never violated. |

---

### Run Commands

#### Deadlock Demos
- **UNSAFE Mode (Circular Wait, Detection & Recovery)**:
  ```bash
  npm run demo:deadlock:unsafe
  ```
- **SAFE Mode (Resource Ordering Prevention)**:
  ```bash
  npm run demo:deadlock:safe
  ```

#### Race Condition Demos
- **UNSAFE Mode (Context-Interleaving Double Booking)**:
  ```bash
  npm run demo:race:unsafe
  ```
- **SAFE Mode (Atomic Semaphore Guard)**:
  ```bash
  npm run demo:race:safe
  ```
