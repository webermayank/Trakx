import jwt from "jsonwebtoken";
import crypto from "node:crypto";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "JWT_SECRET must be set and at least 32 characters. Generate one with: openssl rand -base64 64"
    );
  }
  return secret;
}

// ─── Access Token (short-lived: 15 minutes) ───────────────────────────────────
/**
 * Issues a short-lived JWT access token.
 * If JWT_SECRET is weak (< 32 chars) this will throw at runtime.
 */
export function generateAccessToken(payload: Record<string, unknown>): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "15m" });
}

/**
 * Alias kept for backward compatibility with existing code that calls generateToken.
 * @deprecated Use generateAccessToken instead.
 */
export const generateToken = generateAccessToken;

// ─── Refresh Token (long-lived: 30 days, stored in DB) ───────────────────────
/**
 * Generates a cryptographically-random opaque refresh token.
 * The token itself is NOT a JWT — it is a random string stored in the DB
 * so it can be revoked server-side.
 */
export function generateRefreshToken(): { token: string; expiresAt: Date } {
  const token = crypto.randomBytes(48).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  return { token, expiresAt };
}

// ─── Verify ───────────────────────────────────────────────────────────────────
export function verifyToken(token: string): { userId: string; [key: string]: unknown } {
  const decoded = jwt.verify(token, getJwtSecret());
  if (typeof decoded === "string") {
    throw new Error("Invalid token format");
  }
  return decoded as { userId: string; [key: string]: unknown };
}
