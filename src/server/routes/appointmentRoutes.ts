/**
 * appointmentRoutes.ts
 *
 * NOTE ON SIMULATION DISTINCTION:
 * Appointments are future-dated bookings only. They do NOT interact with the live
 * SimulationClock or ResourceManager in any way. There is no resource allocation,
 * no semaphore acquisition, and no injection into the scheduling kernel queue.
 *
 * Walk-in registrations (from /api/patients) immediately feed the live scheduling kernel,
 * whereas scheduled appointments recorded here are purely a booking/schedule ledger.
 */

import { Router, Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { logAction } from "../auditLog/auditLogger";

export function createAppointmentRouter(): Router {
  const router = Router();

  // GET / - List appointments (supports simple ?status= filter)
  router.get("/", async (req: Request, res: Response) => {
    try {
      const { status } = req.query;
      
      const appointments = await prisma.appointment.findMany({
        where: status ? { status: String(status) } : {},
        include: {
          staff: true,
        },
        orderBy: {
          scheduledAt: "asc",
        },
      });

      return res.status(200).json({
        success: true,
        message: "Appointments retrieved successfully.",
        data: appointments,
      });
    } catch (err: any) {
      console.error("[Appointments] Error listing appointments:", err);
      return res.status(500).json({
        success: false,
        message: `Failed to retrieve appointments: ${err.message}`,
      });
    }
  });

  // POST / - Create a new appointment
  router.post("/", async (req: Request, res: Response) => {
    try {
      const { patientName, staffId, scheduledAt, reason } = req.body;

      if (!patientName || !staffId || !scheduledAt || !reason) {
        return res.status(400).json({
          success: false,
          message: "All fields (patientName, staffId, scheduledAt, reason) are required.",
        });
      }

      // Check if staff member exists
      const staff = await prisma.staffMember.findUnique({
        where: { id: staffId },
      });

      if (!staff) {
        return res.status(404).json({
          success: false,
          message: "Selected staff member not found.",
        });
      }

      const appointment = await prisma.appointment.create({
        data: {
          patientName,
          staffId,
          scheduledAt: new Date(scheduledAt),
          reason,
          status: "SCHEDULED",
        },
        include: {
          staff: true,
        },
      });

      return res.status(201).json({
        success: true,
        message: "Appointment scheduled successfully.",
        data: appointment,
      });
    } catch (err: any) {
      console.error("[Appointments] Error scheduling appointment:", err);
      return res.status(500).json({
        success: false,
        message: `Failed to schedule appointment: ${err.message}`,
      });
    }
  });

  // PUT /:id - Edit an appointment (reschedule time, change reason, reassign staff)
  router.put("/:id", async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { patientName, staffId, scheduledAt, reason } = req.body;

    try {
      const existing = await prisma.appointment.findUnique({
        where: { id },
      });

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Appointment not found.",
        });
      }

      if (staffId) {
        const staff = await prisma.staffMember.findUnique({
          where: { id: staffId },
        });

        if (!staff) {
          return res.status(404).json({
            success: false,
            message: "Selected staff member not found.",
          });
        }
      }

      const updated = await prisma.appointment.update({
        where: { id },
        data: {
          patientName,
          staffId,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
          reason,
        },
        include: {
          staff: true,
        },
      });

      return res.status(200).json({
        success: true,
        message: "Appointment updated successfully.",
        data: updated,
      });
    } catch (err: any) {
      console.error("[Appointments] Error updating appointment:", err);
      return res.status(500).json({
        success: false,
        message: `Failed to update appointment: ${err.message}`,
      });
    }
  });

  // PATCH /:id/cancel - Cancel appointment
  router.patch("/:id/cancel", async (req: Request, res: Response) => {
    const id = req.params.id as string;

    try {
      const existing = await prisma.appointment.findUnique({
        where: { id },
      });

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Appointment not found.",
        });
      }

      const updated = await prisma.appointment.update({
        where: { id },
        data: {
          status: "CANCELLED",
        },
        include: {
          staff: true,
        },
      });

      logAction((req as any).user, "APPOINTMENT_CANCELLED", { appointmentId: id, patientName: existing.patientName });

      return res.status(200).json({
        success: true,
        message: "Appointment cancelled successfully.",
        data: updated,
      });
    } catch (err: any) {
      console.error("[Appointments] Error cancelling appointment:", err);
      return res.status(500).json({
        success: false,
        message: `Failed to cancel appointment: ${err.message}`,
      });
    }
  });

  // PATCH /:id/complete - Mark appointment as completed
  router.patch("/:id/complete", async (req: Request, res: Response) => {
    const id = req.params.id as string;

    try {
      const existing = await prisma.appointment.findUnique({
        where: { id },
      });

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Appointment not found.",
        });
      }

      const updated = await prisma.appointment.update({
        where: { id },
        data: {
          status: "COMPLETED",
        },
        include: {
          staff: true,
        },
      });

      return res.status(200).json({
        success: true,
        message: "Appointment marked as completed successfully.",
        data: updated,
      });
    } catch (err: any) {
      console.error("[Appointments] Error completing appointment:", err);
      return res.status(500).json({
        success: false,
        message: `Failed to complete appointment: ${err.message}`,
      });
    }
  });

  return router;
}
