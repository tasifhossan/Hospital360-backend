# Hospital OS - Backend (Phase 2: Patients & FCFS Scheduler)

Backend "kernel" for the Smart Hospital Resource Scheduling & Management
System. Phase 2 introduces patients (processes/PCBs), workload generation (Poisson/Uniform arrivals), the baseline FCFS scheduling policy, and the central timer interrupt (SimulationClock) coordinating execution and resource allocation.

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
| `src/core/SimulationClock.ts` | The **Timer Interrupt / Scheduler Dispatch Loop**. Advances simulated time, processes arrived patients, and runs the dispatcher to allocate resources all-or-nothing (deadlock prevention). |
| `src/core/ResourceManager.demo.ts` | Proof-of-concept: 5 "doctors" compete for 2 operation theatres at once. Shows blocking + FIFO queueing with real timestamps. |
| `src/core/SimulationClock.demo.ts` | Phase 2 end-to-end demo: simulation clock, Poisson arrivals, FCFS ready queue, all-or-nothing allocation, and treatment completions. |

## Run the Demos

### Phase 1: Resource Manager Demo
```bash
npm install
npm run demo:resourcemanager
```
You should see 2 doctors acquire an OT immediately, and the other 3 queue
and get served in arrival order as OTs free up.

### Phase 2: Simulation Clock & FCFS Demo
```bash
npm run demo:simulation
```
Runs a real-time dispatch loop demonstrating Poisson arrivals, FCFS ready-queue accumulation, resource blockages, and completions over simulated time.

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

## Next: Phase 3

- Advanced schedulers: Priority + Aging (to prevent starvation), Multilevel Queue, and Shortest Job First (SJF).

