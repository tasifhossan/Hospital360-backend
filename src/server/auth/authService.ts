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
  return jwt.sign(payload, JWT_SECRET as string, { expiresIn: "8h" });
}

/**
 * Verify a token and return decoded payload.
 */
export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET as string) as TokenPayload;
}

/**
 * Hash a password using bcryptjs.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compare plain text password to hashed password.
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
