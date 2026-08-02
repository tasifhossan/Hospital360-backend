# Hospital OS Core Kernel Simulation

This directory contains the core modules simulating Operating System (OS) concepts within a hospital scheduling and resource management context.

## OS Concept Mapping

### 1. [Semaphore.ts](file:///d:/pr-project/hospital360/backend/src/core/Semaphore.ts)
* **OS Concept:** Counting Semaphore.
* **Details:** Implements Dijkstra's classic Semaphore with `wait(S)`/`P(S)` mapped to `acquire()` and `signal(S)`/`V(S)` mapped to `release()`. It keeps a First-In-First-Out (FIFO) queue of blocked waiters to prevent lost wakeups and ensure process fairness.

### 2. [ResourceManager.ts](file:///d:/pr-project/hospital360/backend/src/core/ResourceManager.ts)
* **OS Concept:** Kernel Resource Allocation Table / Ledger.
* **Details:** Tracks which processes (patients/doctors) hold which resources (ambulances, ventilators, ICU beds). This matches how a kernel maintains state on device allocations and handles dynamic resource capacity increases.

### 3. [DeadlockDetector.ts](file:///d:/pr-project/hospital360/backend/src/core/DeadlockDetector.ts)
* **OS Concept:** Wait-For Graph (WFG) Cycle Detection.
* **Details:** Builds a Wait-For Graph by evaluating which processes hold resources and which processes are blocked waiting for those resources. It detects deadlock states by searching for cycles using a Depth-First Search (DFS) algorithm.

### 4. [SimulationClock.ts](file:///d:/pr-project/hospital360/backend/src/core/SimulationClock.ts)
* **OS Concept:** Timer Interrupt & Scheduler Dispatch Loop.
* **Details:** Acts as a periodic hardware timer interrupt. Each tick advances simulated time, processes completed CPU tasks (treatments), runs a FCFS/Priority scheduling algorithm, and handles resource requests with an All-or-Nothing allocation policy to prevent deadlocks.

### 5. [PatientGenerator.ts](file:///d:/pr-project/hospital360/backend/src/core/PatientGenerator.ts)
* **OS Concept:** Job/Process Arrival Queue.
* **Details:** Simulates a workload generator, creating processes with random execution requirements and arrival intervals to feed the OS scheduling queues.
