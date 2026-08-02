import { Request, Response, NextFunction } from "express";
import { verifyToken, TokenPayload } from "./authService";

// Extend Request interface locally for TypeScript convenience
export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

/**
 * requireAuth middleware
 * Verifies JWT from authorization header and attaches user context to request
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({
      success: false,
      message: "Authentication token is missing. Access denied.",
    });
    return;
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    res.status(401).json({
      success: false,
      message: "Invalid authorization format. Expected 'Bearer <token>'.",
    });
    return;
  }

  const token = parts[1];

  try {
    const decoded = verifyToken(token);
    (req as any).user = decoded;
    next();
  } catch (error: any) {
    res.status(401).json({
      success: false,
      message: `Invalid or expired authentication token: ${error.message}`,
    });
  }
}

/**
 * requireRole middleware factory
 * Restricts access to specific roles. Returns 403 Forbidden if unauthorized.
 */
export function requireRole(...allowedRoles: Array<TokenPayload["accessRole"]>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user as TokenPayload | undefined;
    if (!user) {
      res.status(401).json({
        success: false,
        message: "User context not found. Authentication required.",
      });
      return;
    }

    if (!allowedRoles.includes(user.accessRole)) {
      res.status(403).json({
        success: false,
        message: `Forbidden: Privilege level '${user.accessRole}' lacks permission. Needs: ${allowedRoles.join(", ")}`,
      });
      return;
    }

    next();
  };
}
