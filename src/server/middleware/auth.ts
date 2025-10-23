import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Extend Request interface to include user data
declare global {
  namespace Express {
    interface Request {
      user?: {
        telegramId: string;
        userId?: string;
      };
    }
  }
}

/**
 * JWT Authentication Middleware
 * Validates JWT token from Authorization header and extracts user information
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 * @returns 401 if no token, 403 if invalid token, 500 if server error, or calls next()
 */
export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      code: "MISSING_TOKEN",
      message: "Authorization token required.",
    });
  }

  jwt.verify(token, process.env.JWT_SECRET!, (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({
        code: "INVALID_TOKEN",
        message: "Invalid or expired token.",
      });
    }

    // Add user info to request
    req.user = {
      telegramId: decoded.telegramId,
      userId: decoded.userId,
    };

    next();
  });
};

/**
 * Telegram ID Validation Middleware
 * Validates that the telegramId in request matches the authenticated user
 * @param req - Express request object (should have user from authenticateToken)
 * @param res - Express response object
 * @param next - Express next function
 * @returns 400 if telegramId missing, 403 if mismatch, or calls next()
 */
export const validateTelegramId = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { telegramId } = req.body || req.query;

  if (!telegramId) {
    return res.status(400).json({
      code: "MISSING_TELEGRAM_ID",
      message: "telegramId is required.",
    });
  }

  // If user is authenticated via JWT, validate telegramId matches
  if (req.user && req.user.telegramId !== telegramId) {
    return res.status(403).json({
      code: "UNAUTHORIZED",
      message: "Cannot access other user's data.",
    });
  }

  next();
};

/**
 * Allocation Input Validation
 * Validates required fields and data types for allocation requests
 * @param req - Express request object with body containing allocation data
 * @param res - Express response object
 * @param next - Express next function
 * @returns 400 for validation errors, or calls next() if valid
 */
export const validateAllocationInput = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { algoId, amountSol } = req.body || {};

  // Validate required fields (telegramId comes from JWT token)
  if (!algoId) {
    return res.status(400).json({
      code: "BAD_INPUT",
      message: "algoId is required.",
    });
  }

  // Validate amountSol for enable endpoint
  if (amountSol !== undefined) {
    const amount = Number(amountSol);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        code: "INVALID_AMOUNT",
        message: "amountSol must be a positive number.",
      });
    }

    // max limit sol
    const MAX_ALLOCATION_SOL = Number(process.env.MAX_ALLOCATION_SOL) || 1000;
    if (amount > MAX_ALLOCATION_SOL) {
      return res.status(400).json({
        code: "AMOUNT_TOO_LARGE",
        message: `amountSol cannot exceed ${MAX_ALLOCATION_SOL} SOL.`,
      });
    }

    // Check decimal places
    const decimalPlaces = (amount.toString().split(".")[1] || "").length;
    if (decimalPlaces > 9) {
      return res.status(400).json({
        code: "INVALID_PRECISION",
        message: "amountSol cannot have more than 9 decimal places.",
      });
    }
  }

  next();
};
