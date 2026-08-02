import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("CRITICAL: JWT_SECRET environment variable is not set!");
}

export interface TokenPayload {
  userId: string;
  email: string;
  accessRole: "ADMIN" | "RECEPTIONIST" | "DOCTOR" | "NURSE";
}

/**
 * Sign a payload into a JWT token. Expiry set to 8 hours.
 */
export function signToken(payload: TokenPayload): string {
  // TODO: Make token expiration time configurable via environment variables rather than hardcoding "8h"
  return jwt.sign(payload, JWT_SECRET as string, { expiresIn: "8h" });
}

/**
 * Verify a token and return decoded payload.
 */
export function verifyToken(token: string): TokenPayload {
  // TODO: Add runtime schema validation (e.g. using Zod) to verify the structure and validity of the decoded TokenPayload
  return jwt.verify(token, JWT_SECRET as string) as TokenPayload;
}

/**
 * Hash a password using bcryptjs.
 */
export async function hashPassword(password: string): Promise<string> {
  // TODO: Make bcrypt salt rounds configurable or increase to 12 for greater security in production
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compare plain text password to hashed password.
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
