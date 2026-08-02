# 🏥 Hospital360 - Smart Hospital Resource Scheduling & Management System

An interactive, full-stack Operating System (OS) Kernel Simulation designed as a medical resource dispatch system. This project models core operating system concepts—such as counting semaphores, process schedulers, wait-for graph cycle detectors, hardware interrupts, and protection rings—inside a hospital simulation.

### 🔗 Repositories
* **Frontend Console**: [Hospital360-frontend](https://github.com/tasifhossan/Hospital360-frontend)
* **Backend Kernel**: [Hospital360-backend](https://github.com/tasifhossan/Hospital360-backend)

---

## 📸 Demo & Screenshots

![Simulation Running](docs/demo.gif)
*A placeholder for the real-time simulation running FCFS scheduling, resource allocations, and automatic deadlock detection.*

---

## 🧩 OS-Concept-to-Feature Mapping

| OS Concept | Hospital Simulation Counterpart | Implementation Details & File Reference |
| :--- | :--- | :--- |
| **Counting Semaphore** | Medical Staff & Room Allocation | Implemented from scratch as a counting semaphore. P/V operations manage exclusive resource limits. See [Semaphore.ts](file:///d:/pr-project/hospital360/backend/src/core/Semaphore.ts). |
| **CPU Scheduler & Dispatcher** | Treatment Queue Scheduler | Implements FCFS, SJF, Multilevel Queue, and Priority + Aging schedulers to dispatch patients to doctor/nurse pools. See [SimulationClock.ts](file:///d:/pr-project/hospital360/backend/src/core/SimulationClock.ts). |
| **Deadlock Prevention** | All-or-Nothing Allocation | Verifies all requested resources are available before allocation, preventing hold-and-wait deadlocks. See `canAllocate` in [SimulationClock.ts](file:///d:/pr-project/hospital360/backend/src/core/SimulationClock.ts). |
| **Deadlock Detection** | Wait-For Graph (WFG) Cycle Detection | Periodically inspects resource occupancy and pending queues to build a directed Wait-For Graph. A Depth-First Search (DFS) detects back-edge cycles. See [DeadlockDetector.ts](file:///d:/pr-project/hospital360/backend/src/core/DeadlockDetector.ts). |
| **Hardware Timer Interrupt** | Simulation Clock Heartbeat | Uses a periodic timer interrupt loop to advance simulation state, evaluate ready queues, and log metrics. See [SimulationClock.ts](file:///d:/pr-project/hospital360/backend/src/core/SimulationClock.ts). |
| **Protection Rings / Security Domains** | Role-Based Access Control (RBAC) | Restricts access to sensitive routes (admin, receptionist, doctor, nurse) based on JWT access roles. See [authMiddleware.ts](file:///d:/pr-project/hospital360/backend/src/server/auth/authMiddleware.ts). |
| **Syslog Monitor** | Database Audit Logs | Secure database audit ledger capturing critical state transitions, retrying writes with backoff, and logging to a local fallback file on failure. See [auditLogger.ts](file:///d:/pr-project/hospital360/backend/src/server/auditLog/auditLogger.ts). |

---

## 🛠️ Technology Stack

* **Frontend**: Next.js 15, React 19, Tailwind CSS, Lucide React, Socket.io-client.
* **Backend**: Node.js, Express, Socket.io, TypeScript, Prisma ORM, PostgreSQL (Neon).
* **Testing**: Vitest.

---

## ⚡ Local Setup Instructions

### Prerequisites
- Node.js (v18+)
- npm

### 1. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Fill in your local/cloud `DATABASE_URL` (PostgreSQL) and custom `JWT_SECRET`.
4. Apply Prisma migrations and database seed (if configured):
   ```bash
   npx prisma migrate dev
   ```
5. Start the backend development server:
   ```bash
   npm run dev:server
   ```
   *The server will boot by default on port `4000`.*

### 2. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure the environment variables (optional, defaults to localhost):
   - Set `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SOCKET_URL` in `.env.local`:
     ```env
     NEXT_PUBLIC_API_URL=http://localhost:4000
     NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
     ```
4. Run the frontend development server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Running Tests
To run backend unit tests verifying Semaphore queue orders, deadlock cycle detection, and audit logger retry mechanisms:
```bash
cd backend
npm run test
```

---

## 🌐 Production Deployment
For step-by-step instructions on deploying the full-stack system manually on Neon/Supabase, Railway/Render, and Vercel, see the [Manual Deployment Guide](file:///d:/pr-project/hospital360/docs/DEPLOYMENT.md).
