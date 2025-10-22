import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

export interface JWTPayload {
  telegramId: string;
  userId?: string;
  iat?: number;
  exp?: number;
}

/**
 * Generate a JWT token for a user
 * @param telegramId - Telegram user ID
 * @param userId - Optional database user ID
 * @returns JWT token string
 */
export function generateToken(telegramId: string, userId?: string): string {
  const payload: JWTPayload = {
    telegramId,
    userId,
  };

  return jwt.sign(payload, JWT_SECRET!, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: "koi-fish-bot",
  } as jwt.SignOptions);
}

/**
 * Verify and decode a JWT token
 * @param token - JWT token string
 * @returns Decoded payload or null if invalid
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET!) as unknown;
    return decoded as JWTPayload;
  } catch (error) {
    console.error("JWT verification failed:", error);
    return null;
  }
}

/**
 * Create a test token for development/testing
 * @param telegramId - Telegram user ID
 * @returns JWT token for testing
 */
export function createTestToken(telegramId: string): string {
  return generateToken(telegramId, "test-user-id");
}
