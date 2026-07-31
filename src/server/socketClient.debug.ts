/**
 * socketClient.debug.ts
 *
 * A lightweight socket.io-client debugging tool.
 * Connects to the live server on port 4000 and prints incoming simulation ticks
 * and discrete notification events to verify push functionality.
 */

import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:4000";
console.log(`[Debug Client] Connecting to ${SOCKET_URL}...`);

const socket = io(SOCKET_URL);

socket.on("connect", () => {
  console.log(`[Debug Client] 🟢 Connected to server! Socket ID: ${socket.id}`);
});

socket.on("connect_error", (error) => {
  console.error("[Debug Client] ❌ Connection error:", error.message);
});

socket.on("disconnect", (reason) => {
  console.log("[Debug Client] 🔴 Disconnected:", reason);
});

// Listen for global simulation state ticks
socket.on("simulation:state", (snapshot: any) => {
  console.log(
    `\n[Tick: ${snapshot.simulatedTime}ms] Scheduler: ${snapshot.schedulerName}`
  );
  console.log(
    `   └─ Waiting Queue Length: ${snapshot.queue.length}`
  );
  console.log(
    `   └─ Active Treatments:    ${snapshot.activeTreatments.length}`
  );
  console.log(
    `   └─ Served So Far:        ${snapshot.stats.completedCount} (Avg Wait: ${snapshot.stats.avgWaitTimeMs}ms)`
  );
  
  // Print resource occupancy status
  const resKeys = Object.keys(snapshot.resourceStatus);
  const resourceLine = resKeys
    .map((k) => `${k}: ${snapshot.resourceStatus[k].inUse}/${snapshot.resourceStatus[k].capacity}`)
    .join(" | ");
  console.log(`   └─ Resources: [ ${resourceLine} ]`);
});

// Listen for discrete event notifications
const events = ["patient:arrived", "patient:treatmentStarted", "patient:completed"];
events.forEach((evtName) => {
  socket.on(evtName, (eventData: any) => {
    const p = eventData.patient;
    console.log(
      `\n🔔 [EVENT: ${evtName.toUpperCase()}] at ${new Date(eventData.timestamp).toLocaleTimeString()}`
    );
    console.log(`   └─ Patient: ${p.name} (${p.id}) | Priority: ${p.priority}`);
    if (evtName === "patient:treatmentStarted") {
      console.log(`   └─ Allocated resources: [${p.requiredResources.join(", ")}]`);
    }
  });
});
