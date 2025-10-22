import { Router } from "express";
import { generateToken, createTestToken } from "../middleware/jwt.ts";

const route = Router();

/**
 * POST /api/auth/token
 * Generate a JWT token (dev)
 * body: { telegramId: string }
 */
route.post("/api/auth/token", async (req, res) => {
  const { telegramId } = req.body || {};

  if (!telegramId) {
    return res.status(400).json({
      code: "MISSING_TELEGRAM_ID",
      message: "telegramId is required.",
    });
  }

  // Validate telegramId format
  if (typeof telegramId !== "string" || !/^\d+$/.test(telegramId)) {
    return res.status(400).json({
      code: "INVALID_TELEGRAM_ID",
      message: "telegramId must be a numeric string.",
    });
  }

  try {
    const token = generateToken(telegramId);

    return res.json({
      success: true,
      token,
      telegramId,
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    });
  } catch (error) {
    console.error("Error generating token:", error);
    return res.status(500).json({
      code: "TOKEN_GENERATION_ERROR",
      message: "Failed to generate token",
    });
  }
});

/**
 * POST /api/auth/test-token
 * Generate a test token for development
 * body: { telegramId: string }
 */
route.post("/api/auth/test-token", async (req, res) => {
  const { telegramId } = req.body || {};

  if (!telegramId) {
    return res.status(400).json({
      code: "MISSING_TELEGRAM_ID",
      message: "telegramId is required.",
    });
  }

  try {
    const token = createTestToken(telegramId);

    return res.json({
      success: true,
      token,
      telegramId,
      note: "This is a test token for development only.",
    });
  } catch (error) {
    console.error("Error generating test token:", error);
    return res.status(500).json({
      code: "TOKEN_GENERATION_ERROR",
      message: "Failed to generate test token.",
    });
  }
});

export default route;
