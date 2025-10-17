import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

const getJWTSecret = (): string => {
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required but not set');
  }
  return JWT_SECRET;
};

export interface JWTPayload {
  userId: string;
  email?: string;
  iat?: number;
  exp?: number;
}

/**
 * Generate a JWT token for a user
 */
export const generateToken = (userId: string, email?: string): string => {
  const payload: JWTPayload = {
    userId,
    email,
  };

  return jwt.sign(payload, getJWTSecret(), {
    expiresIn: '24h', // Token expires in 24 hours
  });
};

/**
 * Verify a JWT token and extract the payload
 */
export const verifyToken = (token: string): JWTPayload => {
  try {
    const decoded = jwt.verify(token, getJWTSecret()) as JWTPayload;
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

/**
 * Middleware to authenticate JWT tokens
 */
export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Access token required'
    });
    return;
  }

  try {
    const payload = verifyToken(token);
    req.user = payload; // Attach user info to request object
    next();
  } catch (error) {
    res.status(403).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
};

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}
