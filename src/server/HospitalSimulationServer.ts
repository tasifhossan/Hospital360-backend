/**
 * HospitalSimulationServer.ts
 *
 * OS Analogue:
 * - Operating System Kernel Host & Syscall Dispatcher.
 *   This is the main "hardware wrapper" that hosts the SimulationClock kernel,
 *   standing up Express (the Syscall Gateway / REST API) and Socket.io (the Interrupt / Notification controller)
 *   to expose the system's runtime status to monitoring screens (the User Interface).
 */

import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import cors from "cors";
import { SimulationClock } from "../core/SimulationClock";
import { ResourceManager } from "../core/ResourceManager";
import { createScheduler, SchedulerType } from "../core/schedulers/SchedulerRegistry";
import { PatientGenerator } from "../core/PatientGenerator";
import { RESOURCE_CAPACITY } from "../types/resources";
import { getSimulationStateSnapshot } from "./socket/broadcastState";
import { createSimulationRouter } from "./routes/simulationRoutes";
import { createAdminRouter } from "./routes/adminRoutes";
import { createComparisonRouter } from "./routes/comparisonRoutes";

export class HospitalSimulationServer {
  private readonly app: express.Application;
  private readonly server: http.Server;
  private readonly io: SocketIOServer;
  private readonly clock: SimulationClock;
  private readonly state: { currentAlgorithm: SchedulerType };
  private activePort: number | null = null;

  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);

    // Permissive CORS configuration for local development
    this.app.use(
      cors({
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
      })
    );
    this.app.use(express.json());

    // Initialize simulation kernel state
    this.state = { currentAlgorithm: "FCFS" };

    const rm = new ResourceManager(RESOURCE_CAPACITY);
    const scheduler = createScheduler(this.state.currentAlgorithm, {
      getCurrentTime: () => 0,
    });
    const generator = new PatientGenerator({
      arrivalMode: "POISSON",
      avgArrivalsPerMinute: 20, // 20 arrivals per simulated minute
    });

    this.clock = new SimulationClock(rm, scheduler, generator, {
      tickIntervalMs: 1000,      // Ticks every 1000ms in real-world time
      simulatedMsPerTick: 1000,   // Advances simulated time by 1000ms per tick
    });

    // Initialize Socket.io server on the same http server
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });

    // Wire up simulation hooks for real-time broadcasts
    this.setupSimulationEvents();

    // Mount REST routes (Syscalls)
    this.mountRoutes();
  }

  private setupSimulationEvents(): void {
    // Every clock tick, broadcast the entire simulation state snapshot
    this.clock.onTick(() => {
      const snapshot = getSimulationStateSnapshot(this.clock);
      this.io.emit("simulation:state", snapshot);
    });

    // Broadcast discrete events (toast notifications)
    this.clock.onEvent((event, patient) => {
      this.io.emit(event, {
        event,
        timestamp: Date.now(),
        patient: {
          id: patient.id,
          name: patient.name,
          priority: patient.priority,
          requiredResources: patient.requiredResources,
          treatmentDurationMs: patient.treatmentDurationMs,
        },
      });
    });

    // Socket.io client connection logger
    this.io.on("connection", (socket) => {
      console.log(`[Socket] 🔌 Client connected: ${socket.id}`);
      
      // Send immediate state snapshot upon connection
      const snapshot = getSimulationStateSnapshot(this.clock);
      socket.emit("simulation:state", snapshot);

      socket.on("disconnect", () => {
        console.log(`[Socket] 🔌 Client disconnected: ${socket.id}`);
      });
    });
  }

  private mountRoutes(): void {
    // Health Check
    this.app.get("/health", (req, res) => {
      res.status(200).json({ status: "healthy", timestamp: new Date() });
    });

    // API routers
    this.app.use("/api/simulation", createSimulationRouter(this.clock, this.state));
    this.app.use("/api/admin", createAdminRouter(this.clock));
    this.app.use("/api/comparison", createComparisonRouter());
  }

  /**
   * Start the Express and Socket.io server listening on the specified port.
   */
  start(port: number): Promise<void> {
    return new Promise<void>((resolve) => {
      this.server.listen(port, () => {
        this.activePort = port;
        console.log("=================================================");
        console.log(`🏥 Hospital OS Server is online on port ${port}`);
        console.log(`👉 REST Base URL: http://localhost:${port}/api`);
        console.log(`👉 WS Socket.io:  ws://localhost:${port}`);
        console.log("=================================================");
        resolve();
      });
    });
  }

  /**
   * Gracefully stop the server and cleanup simulation runs.
   */
  stop(): Promise<void> {
    console.log("\n[Kernel] 🛑 Shutting down Hospital OS Server...");
    this.clock.stop();
    return new Promise<void>((resolve) => {
      this.server.close(() => {
        console.log("[Kernel] 👋 Server closed successfully.");
        resolve();
      });
    });
  }
}
