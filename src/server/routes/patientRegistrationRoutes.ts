import { Router, Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { SimulationClock } from "../../core/SimulationClock";
import { logAction } from "../auditLog/auditLogger";

export function createPatientRegistrationRouter(clock: SimulationClock): Router {
  const router = Router();

  // POST / - Register walk-in patient and enqueue into active simulation clock if running
  router.post("/", async (req: Request, res: Response) => {
    try {
      const { name, condition, priority, requiredResources, registeredBy } = req.body;
      
      if (!name || !condition || !priority || !requiredResources || !registeredBy) {
        return res.status(400).json({
          success: false,
          message: "All fields (name, condition, priority, requiredResources, registeredBy) are required.",
        });
      }

      // 1. Persist to Postgres database
      const patientDb = await prisma.registeredPatient.create({
        data: {
          name,
          condition,
          priority,
          requiredResources,
          status: "REGISTERED",
          registeredBy,
        },
      });

      let injected = false;
      let simulationPatientId: string | null = null;

      // 2. If simulation is running, inject into active scheduler ready queue
      if (clock.isRunning()) {
        simulationPatientId = `RP-${patientDb.id}`;

        // Construct standard CPU-analogue Patient duration based on Priority
        let treatmentDurationMs = 1000;
        if (priority === "HIGH") {
          treatmentDurationMs = Math.floor(3000 + Math.random() * 2000);
        } else if (priority === "MEDIUM") {
          treatmentDurationMs = Math.floor(1500 + Math.random() * 1000);
        } else {
          treatmentDurationMs = Math.floor(500 + Math.random() * 500);
        }

        const simulationPatient = {
          id: simulationPatientId,
          name: patientDb.name,
          priority: patientDb.priority as any,
          arrivalTime: clock.getSimulatedTime(),
          requiredResources: patientDb.requiredResources as any,
          treatmentDurationMs,
          status: "WAITING" as const,
          queuedAt: clock.getSimulatedTime(),
        };

        // Enqueue patient
        clock.getScheduler().enqueue(simulationPatient);

        // Update database registration status
        await prisma.registeredPatient.update({
          where: { id: patientDb.id },
          data: {
            status: "INJECTED_TO_QUEUE",
            simulationPatientId,
          },
        });

        injected = true;
      }

      logAction((req as any).user, "PATIENT_REGISTERED", { patientId: patientDb.id, name: patientDb.name, condition: patientDb.condition });

      return res.status(201).json({
        success: true,
        message: injected
          ? "Patient registered and injected into simulation queue successfully."
          : "Patient registered successfully (simulation not running, not injected).",
        data: {
          ...patientDb,
          status: injected ? "INJECTED_TO_QUEUE" : "REGISTERED",
          simulationPatientId,
        },
      });
    } catch (err: any) {
      console.error("[PatientRegistration] Error creating registration:", err);
      return res.status(500).json({
        success: false,
        message: `Failed to register patient: ${err.message}`,
      });
    }
  });

  // GET / - List all walk-in registrations, most recent first
  router.get("/", async (req: Request, res: Response) => {
    try {
      const patients = await prisma.registeredPatient.findMany({
        orderBy: { registeredAt: "desc" },
      });
      return res.status(200).json({
        success: true,
        message: "Registered patients retrieved successfully.",
        data: patients,
      });
    } catch (err: any) {
      console.error("[PatientRegistration] Error listing registrations:", err);
      return res.status(500).json({
        success: false,
        message: `Failed to retrieve registered patients: ${err.message}`,
      });
    }
  });

  // PUT /:id - Edit details of registered patient (only if status is still REGISTERED)
  router.put("/:id", async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { name, condition, priority, requiredResources, registeredBy } = req.body;

    try {
      const existing = await prisma.registeredPatient.findUnique({
        where: { id },
      });

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Registered patient not found.",
        });
      }

      if (existing.status !== "REGISTERED") {
        return res.status(409).json({
          success: false,
          message: `Cannot edit details because patient is already injected or cancelled (Status: ${existing.status}).`,
        });
      }

      const updated = await prisma.registeredPatient.update({
        where: { id },
        data: {
          name,
          condition,
          priority,
          requiredResources,
          registeredBy,
        },
      });

      return res.status(200).json({
        success: true,
        message: "Patient registration updated successfully.",
        data: updated,
      });
    } catch (err: any) {
      console.error("[PatientRegistration] Error updating registration:", err);
      return res.status(500).json({
        success: false,
        message: `Failed to update patient registration: ${err.message}`,
      });
    }
  });

  // DELETE /:id - Soft-delete/cancel registration (only if status is still REGISTERED)
  router.delete("/:id", async (req: Request, res: Response) => {
    const id = req.params.id as string;

    try {
      const existing = await prisma.registeredPatient.findUnique({
        where: { id },
      });

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Registered patient not found.",
        });
      }

      if (existing.status !== "REGISTERED") {
        return res.status(409).json({
          success: false,
          message: `Cannot cancel registration because patient is already injected or cancelled (Status: ${existing.status}).`,
        });
      }

      const updated = await prisma.registeredPatient.update({
        where: { id },
        data: {
          status: "CANCELLED",
        },
      });

      logAction((req as any).user, "PATIENT_CANCELLED", { patientId: id, name: existing.name });

      return res.status(200).json({
        success: true,
        message: "Patient registration cancelled successfully.",
        data: updated,
      });
    } catch (err: any) {
      console.error("[PatientRegistration] Error cancelling registration:", err);
      return res.status(500).json({
        success: false,
        message: `Failed to cancel patient registration: ${err.message}`,
      });
    }
  });

  return router;
}
