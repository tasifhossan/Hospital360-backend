import { Router, Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { comparePassword, hashPassword, signToken } from "../auth/authService";
import { requireAuth, requireRole } from "../auth/authMiddleware";

export function createAuthRouter(): Router {
  const router = Router();

  // POST /login
  router.post("/login", async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    try {
      // Find the user
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        // Return 401 generic message to avoid leaking user presence
        return res.status(401).json({
          success: false,
          message: "Invalid email or password.",
        });
      }

      // Verify password
      const isMatch = await comparePassword(password, user.passwordHash);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password.",
        });
      }

      // Generate JWT
      const tokenPayload = {
        userId: user.id,
        email: user.email,
        accessRole: user.accessRole,
      };

      const token = signToken(tokenPayload);

      return res.status(200).json({
        success: true,
        message: "Login successful.",
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            accessRole: user.accessRole,
            staffMemberId: user.staffMemberId,
          },
        },
      });
    } catch (error: any) {
      console.error("[Auth] Login error:", error);
      return res.status(500).json({
        success: false,
        message: "An internal server error occurred during login.",
      });
    }
  });

  // GET /me
  router.get("/me", requireAuth, async (req: Request, res: Response) => {
    const user = (req as any).user;
    return res.status(200).json({
      success: true,
      message: "Current user profile retrieved successfully.",
      data: {
        user,
      },
    });
  });

  // POST /create-user
  // Provisioning new users. Restricted to Admin.
  router.post("/create-user", requireAuth, requireRole("ADMIN"), async (req: Request, res: Response) => {
    const { email, password, accessRole, staffMemberId } = req.body;

    if (!email || !password || !accessRole) {
      return res.status(400).json({
        success: false,
        message: "Email, password, and accessRole are required fields.",
      });
    }

    const validRoles = ["ADMIN", "RECEPTIONIST", "DOCTOR", "NURSE"];
    if (!validRoles.includes(accessRole)) {
      return res.status(400).json({
        success: false,
        message: `Invalid accessRole. Must be one of: ${validRoles.join(", ")}`,
      });
    }

    try {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "A user with this email already exists.",
        });
      }

      // If staffMemberId is provided, check if it exists and is not already linked
      if (staffMemberId) {
        const staff = await prisma.staffMember.findUnique({
          where: { id: staffMemberId },
        });

        if (!staff) {
          return res.status(404).json({
            success: false,
            message: "The specified staffMemberId was not found.",
          });
        }

        const linkedUser = await prisma.user.findUnique({
          where: { staffMemberId },
        });

        if (linkedUser) {
          return res.status(409).json({
            success: false,
            message: "The specified StaffMember is already linked to another User account.",
          });
        }
      }

      const passwordHash = await hashPassword(password);

      const newUser = await prisma.user.create({
        data: {
          email,
          passwordHash,
          accessRole,
          staffMemberId: staffMemberId || null,
        },
      });

      return res.status(201).json({
        success: true,
        message: "User account created successfully.",
        data: {
          id: newUser.id,
          email: newUser.email,
          accessRole: newUser.accessRole,
          staffMemberId: newUser.staffMemberId,
        },
      });
    } catch (error: any) {
      console.error("[Auth] User creation error:", error);
      return res.status(500).json({
        success: false,
        message: `Failed to create user account: ${error.message}`,
      });
    }
  });

  return router;
}
