# 🏥 Hospital OS - Backend Kernel

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Neon Postgres](https://img.shields.io/badge/Neon_PostgreSQL-00E599?style=for-the-badge&logo=postgresql&logoColor=black)](https://neon.tech/)

This is the backend server hosting the core Operating System (OS) simulation engine (the "kernel") for the Hospital OS platform. It models real-time CPU scheduling, timer ticks, counting semaphores, deadlock cycle detection, access control lists, and kernel security loggers.

---

## 📂 Backend File & Submodule Directory

| File | OS Concept Demonstrated | Technical Details |
|---|---|---|
| `src/core/Semaphore.ts` | Counting Semaphore | Hand-rolled P/V (wait/signal) logic. FIFO queuing of blocked processes without busy-waiting. |
| `src/core/ResourceManager.ts` | Lock Table / Resource Ledger | Controls availability and allocation blocks of finite resource handles. |
| `src/types/patient.ts` | Process Control Block (PCB) | Tracks scheduling priorities, CPU burst estimates, and process lifecycles. |
| `src/core/PatientGenerator.ts` | Job Workload Generator | Synthesizes incoming tasks using a mathematical Poisson process. |
| `src/core/schedulers/` | CPU Schedulers | Dynamic swappable scheduling policies: FCFS, SJF, Multilevel Queue, and Priority Aging. |
| `src/core/DeadlockDetector.ts` | Resource Graph Analysis | DFS-based cycle detector evaluating wait-for states to break circular wait deadlocks. |
| `src/core/SimulationClock.ts` | Timer Interrupt Dispatcher | Coordinates ticking intervals, dispatch loops, and resource distributions. |

---

## 🛠️ Running Low-Level Command-Line Demos

To execute isolated OS concept simulations in the terminal, run the following commands:

### 1. Counting Semaphores (Mutex Locks)
Simulates concurrent processes contesting resource boundaries:
```bash
npm run demo:resourcemanager
```

### 2. Time-Sliced FCFS Simulation Loop
Runs the baseline scheduler under dynamic Poisson arrivals:
```bash
npm run demo:simulation
```

### 3. Starvation Benchmarking
Compares wait times across all 4 scheduling policies under identical workloads:
```bash
npm run demo:comparison
```

### 4. Circular Wait (Deadlock) UNSAFE vs. SAFE Modes
- **UNSAFE Mode (Detection & Recovery)**:
  ```bash
  npm run demo:deadlock:unsafe
  ```
- **SAFE Mode (Resource Ordering Prevention)**:
  ```bash
  npm run demo:deadlock:safe
  ```

### 5. Race Conditions UNSAFE vs. SAFE Modes
- **UNSAFE Mode (Context-Interleaving Double Booking)**:
  ```bash
  npm run demo:race:unsafe
  ```
- **SAFE Mode (Atomic Semaphore Mutual Exclusion)**:
  ```bash
  npm run demo:race:safe
  ```

---

## 📡 REST System Calls & Interrupt Broker

The backend exposes simulation state modifications via Express (System Calls) and notifies changes asynchronously via Socket.io (Hardware Interrupts).

### Express System Call API Table

| Method | Endpoint | Required Role | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | Public | Authenticates credentials and returns signed JWT token. |
| `POST` | `/api/auth/create-user`| `ADMIN` | Provisions a new secure account in the Neon database. |
| `POST` | `/api/simulation/start` | `ADMIN` | Resumes the timer interrupt tick loops. |
| `POST` | `/api/simulation/stop` | `ADMIN` | Halts the timer interrupt tick loops. |
| `POST` | `/api/simulation/reset` | `ADMIN` | Flushes queues, allocations, and clears simulated time. |
| `POST` | `/api/simulation/algorithm`| `ADMIN` | Swaps active scheduler policy (allowed only when stopped). |
| `GET` | `/api/simulation/state`| Authenticated | Queries current ready queue and allocation snapshot. |
| `GET` | `/api/admin/resources` | `ADMIN` | Queries raw capacity and usage of counting semaphores. |
| `POST` | `/api/admin/doctors` | `ADMIN` | Hotplugs doctor count to dynamically scale capacity. |
| `POST` | `/api/comparison/run` | `ADMIN` | Sequential benchmark run executing all 4 policies. |
| `GET` | `/api/audit` | `ADMIN` | Paginated query interface for system security logs. |

### Socket.io Event Channels (Interrupts)
- `simulation:state`: Broadcasts state snapshots on every simulated clock tick.
- `patient:arrived`: Pushed when a patient process enters the Ready Queue.
- `patient:treatmentStarted`: Pushed when resources are acquired and execution starts.
- `patient:completed`: Pushed on thread/patient execution completion.

---

## 🔒 Security Architecture (Phase 10)

The backend implements security rings and privilege boundaries to secure the syscall interface:

- **Authentication**: JWT validation layer (`jsonwebtoken`) guarding REST routes. Verifies the caller's identity before granting them access to a **Protection Domain**.
- **Role-Based Access Control**: Privilege Rings. Restricted endpoints require a user payload containing valid roles (`ADMIN`, `RECEPTIONIST`, `DOCTOR`, or `NURSE`).
- **Audit Logging**: Kernel System Logging (`syslog` analogue). Critical transitions are written to the database with detailed JSON trace context.

### provisioned Admin Account
- **Email**: `admin@hospital360.local`
- **Password**: `admin_hospital_secure_2026_!`

