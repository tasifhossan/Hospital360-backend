# Hospital OS - Backend (Phase 3: Advanced Schedulers)

Backend "kernel" for the Smart Hospital Resource Scheduling & Management
System. Phase 3 introduces three new scheduling policies (Priority + Aging, Multilevel Queue, and Shortest Job First) implementing a swappable interface registry, allowing performance comparison under identical workloads.

## What's in the project so far

| File | OS concept it demonstrates |
|---|---|
| `src/core/Semaphore.ts` | A counting semaphore built from scratch (P/V, wait/signal). Blocked callers queue in FIFO order and are woken directly by `release()` - no busy-waiting, no lost wakeups. |
| `src/core/ResourceManager.ts` | The kernel's resource table: one semaphore per resource type (doctor, ICU bed, ventilator, OT, MRI, ambulance), plus an allocation ledger (who holds what) that Phase 4's deadlock detector will read. |
| `src/types/resources.ts` | Resource types + capacities (20 doctors, 10 ICU beds, 5 OTs, etc.) and priority levels, matching the hospital scenario. |
| `src/types/patient.ts` | The `Patient` structure represents a **Process / Process Control Block (PCB)**, tracking priority, resource requests, arrival time, and execution lifecycle state. |
| `src/core/PatientGenerator.ts` | Represents the **Workload/Arrival Process**. Supports Poisson process (exponential inter-arrival) modeling realistic, bursty traffic. |
| `src/core/schedulers/Scheduler.ts` | The **Scheduler Interface (Policy Pattern)**, separating scheduling decisions from the dispatch mechanism to allow hot-swapping algorithms. |
| `src/core/schedulers/FcfsScheduler.ts` | **First-Come, First-Served (FCFS) Scheduling**. Baseline FIFO ready queue. Exposes convoy effects and head-of-line blocking. |
| `src/core/schedulers/PriorityAgingScheduler.ts` | **Priority Scheduling with Aging**. Dynamic priority boosting based on queue wait time to prevent starvation of low-priority tasks. |
| `src/core/schedulers/MultilevelQueueScheduler.ts` | **Multilevel Queue (MLQ) Scheduling**. Class-separated ready queues with strict priority execution and a starvation guard limit to prevent complete starvation of lower classes. |
| `src/core/schedulers/SjfScheduler.ts` | **Shortest Job First (SJF) Scheduling**. Non-preemptive scheduling choosing the task with the shortest treatment (burst) time. Provably optimal for minimizing average wait time. |
| `src/core/schedulers/SchedulerRegistry.ts` | The **Scheduler Registry / Dispatch Table Analogue** allowing dynamic scheduler swapping by name at runtime. |
| `src/core/SimulationClock.ts` | The **Timer Interrupt / Scheduler Dispatch Loop**. Advances simulated time, processes arrived patients, and runs the dispatcher to allocate resources all-or-nothing (deadlock prevention). |
| `src/core/ResourceManager.demo.ts` | Proof-of-concept: 5 "doctors" compete for 2 operation theatres at once. Shows blocking + FIFO queueing with real timestamps. |
| `src/core/SimulationClock.demo.ts` | Phase 2 FCFS end-to-end demo: simulation clock, Poisson arrivals, FCFS ready queue, all-or-nothing allocation, and treatment completions. |
| `src/core/schedulers/SchedulerComparison.demo.ts` | Phase 3 comparison benchmark: runs all 4 scheduling algorithms under the exact same patient workload sequence to compare wait-time metrics. |

## Run the Demos

### Phase 1: Resource Manager Demo
```bash
npm install
npm run demo:resourcemanager
```
Shows blocking + FIFO queueing at the semaphore level under resource contention.

### Phase 2: Simulation Clock & FCFS Demo
```bash
npm run demo:simulation
```
Runs a real-time dispatch loop demonstrating Poisson arrivals, FCFS ready-queue accumulation, resource blockages, and completions over simulated time.

### Phase 3: Scheduler Comparison Benchmarking
```bash
npm run demo:comparison
```
Generates a single identical patient workload and runs it through all four schedulers to compare average wait time, maximum wait time, and HIGH-priority patient wait times.

## Design decisions worth mentioning in your viva

- **Why a hand-rolled semaphore instead of a library?** So the P(S)/V(S)
  logic is visible and explainable line-by-line, not hidden in a dependency.
- **Why release() hands the slot directly to the oldest waiter** instead of
  incrementing the counter and letting waiters race to re-check it? This
  avoids the classic "lost wakeup" race condition and guarantees FCFS
  fairness at the semaphore level.
- **Why track an allocation ledger (`holderIndex`) in `ResourceManager`?**
  This is the Resource-Allocation Graph data Phase 4 needs to detect
  deadlock (e.g. Doctor A holds ICU bed + wants OT, Doctor B holds OT +
  wants ICU bed) via cycle detection, and to implement a Banker's
  Algorithm-style safety check before granting a request.
- **Why enforce All-or-Nothing resource acquisition?**
  Under FCFS, holding partial resources while waiting for others is the direct precursor to deadlock (Hold & Wait condition). Enforcing all-or-nothing allocation prevents deadlocks but exposes head-of-line (HOL) blocking.
- **Why model arrivals using an Exponential distribution (Poisson Process)?**
  Workloads in real systems are not perfectly uniform. In queueing theory, an exponential inter-arrival distribution is the standard mathematical model for memoryless, random arrival processes (e.g., job arrivals, packet arrivals, or emergency patients).
- **How does Priority Aging prevent starvation?**
  A pure priority scheduler will starve low-priority tasks if high-priority tasks keep arriving. The aging formula `effectiveScore = PRIORITY_WEIGHT[priority] - (waitTimeMs / agingRateMs)` dynamically reduces a task's priority weight score (increasing its scheduling importance) the longer it waits, eventually ensuring it gets scheduled.
- **What is the compromise in the Multilevel Queue starvation guard?**
  Real MLQ partitions ready queues strictly, which leads to starvation. We implement a starvation guard: after a threshold of consecutive dispatches from higher-priority queues (HIGH/MEDIUM) while lower queues are non-empty, we force a dispatch from a lower-priority queue (LOW), balancing strict class priority with fairness.
- **Why is SJF optimal, and what is its flaw?**
  SJF is mathematically optimal for minimizing average wait time. However, it can starve long jobs (complex surgeries) indefinitely if short jobs (routine doctor checkups) keep arriving, and it requires knowing/estimating burst times in advance.

## Next: Phase 4

- Deadlock Cycle Detection (Tarjan's/DFS over the Resource-Allocation Graph) and Banker's Algorithm safety checking.

