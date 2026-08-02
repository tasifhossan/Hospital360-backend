import { Router, Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { logAction } from "../auditLog/auditLogger";

export function createStaffRouter(): Router {
  const router = Router();

  // GET / - List all staff members
  router.get("/", async (req: Request, res: Response) => {
    try {
      const staff = await prisma.staffMember.findMany({
        orderBy: { createdAt: "desc" },
      });
      return res.status(200).json({
        success: true,
        message: "Staff roster retrieved successfully.",
        data: staff,
      });
    } catch (err: any) {
      console.error("[Staff] Error listing staff:", err);
      return res.status(500).json({
        success: false,
        message: `Failed to retrieve staff roster: ${err.message}`,
      });
    }
  });

  // POST / - Add a new staff member
  router.post("/", async (req: Request, res: Response) => {
    try {
      const { name, role, status } = req.body;

      if (!name || !role || !status) {
        return res.status(400).json({
          success: false,
          message: "All fields (name, role, status) are required.",
        });
      }

      if (role !== "DOCTOR" && role !== "NURSE") {
        return res.status(400).json({
          success: false,
          message: "Role must be either 'DOCTOR' or 'NURSE'.",
        });
      }

      if (status !== "ACTIVE" && status !== "OFF_SHIFT") {
        return res.status(400).json({
          success: false,
          message: "Status must be either 'ACTIVE' or 'OFF_SHIFT'.",
        });
      }

      const staff = await prisma.staffMember.create({
        data: {
          name,
          role,
          status,
        },
      });

      logAction((req as any).user, "STAFF_ADDED", { staffId: staff.id, name: staff.name, role: staff.role });

      return res.status(201).json({
        success: true,
        message: "Staff member added successfully.",
        data: staff,
      });
    } catch (err: any) {
      console.error("[Staff] Error adding staff member:", err);
      return res.status(500).json({
        success: false,
        message: `Failed to add staff member: ${err.message}`,
      });
    }
  });

  // PUT /:id - Edit an existing staff member
  router.put("/:id", async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { name, role, status } = req.body;

    try {
      const existing = await prisma.staffMember.findUnique({
        where: { id },
      });

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Staff member not found.",
        });
      }

      if (role && role !== "DOCTOR" && role !== "NURSE") {
        return res.status(400).json({
          success: false,
          message: "Role must be either 'DOCTOR' or 'NURSE'.",
        });
      }

      if (status && status !== "ACTIVE" && status !== "OFF_SHIFT") {
        return res.status(400).json({
          success: false,
          message: "Status must be either 'ACTIVE' or 'OFF_SHIFT'.",
        });
      }

      const updated = await prisma.staffMember.update({
        where: { id },
        data: {
          name,
          role,
          status,
        },
      });

      return res.status(200).json({
        success: true,
        message: "Staff member updated successfully.",
        data: updated,
      });
    } catch (err: any) {
      console.error("[Staff] Error updating staff member:", err);
      return res.status(500).json({
        success: false,
        message: `Failed to update staff member: ${err.message}`,
      });
    }
  });

  // DELETE /:id - Remove a staff member
  router.delete("/:id", async (req: Request, res: Response) => {
    const id = req.params.id as string;

    try {
      const existing = await prisma.staffMember.findUnique({
        where: { id },
      });

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Staff member not found.",
        });
      }

      await prisma.staffMember.delete({
        where: { id },
      });

      logAction((req as any).user, "STAFF_REMOVED", { staffId: id, name: existing.name, role: existing.role });

      return res.status(200).json({
        success: true,
        message: "Staff member removed successfully.",
      });
    } catch (err: any) {
      console.error("[Staff] Error deleting staff member:", err);
      return res.status(500).json({
        success: false,
        message: `Failed to remove staff member: ${err.message}`,
      });
    }
  });

  return router;
}
