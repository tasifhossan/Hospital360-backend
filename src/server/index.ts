/**
 * index.ts
 *
 * The bootstrapper/loader of the server subsystem.
 * Responsible for reading environmental parameters, initializing the server host container,
 * and registering kernel interrupts/signals (SIGINT, SIGTERM) to execute a clean,
 * transactional shutdown of the operating system simulation.
 */

import { HospitalSimulationServer } from "./HospitalSimulationServer";

const PORT = parseInt(process.env.PORT || "4000", 10);

const server = new HospitalSimulationServer();

// Start the server
server.start(PORT).catch((error) => {
  console.error("❌ Fatal error during server startup:", error);
  process.exit(1);
});

// Register process signal handlers for graceful shutdown (OS analogue of interrupt handlers)
const handleGracefulShutdown = async (signal: string) => {
  console.log(`\n[Process] 🔌 Received signal ${signal}. Starting shutdown sequence...`);
  try {
    await server.stop();
    console.log("[Process] 🟢 Shutdown completed. Exiting process.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during graceful shutdown:", error);
    process.exit(1);
  }
};

process.on("SIGINT", () => handleGracefulShutdown("SIGINT"));
process.on("SIGTERM", () => handleGracefulShutdown("SIGTERM"));
