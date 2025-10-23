import { Router } from "express";
import { 
  createWalletHandler,
  getWalletHandler
} from "../controllers/wallet.controller.ts";
import { authenticateToken } from "../middleware/auth.ts";

const route = Router();

/**
 * POST /api/wallet/create
 * BODY { chain?: "sol"|"eth"|"base"|"zora" }
 * Creates a new wallet using PRIVY_PUBLIC_AUTHORIZATION_KEY and returns address for frontend
 */
route.post("/api/wallet/create", authenticateToken, createWalletHandler);

/**
 * GET /api/wallet/:walletId
 * Retrieves details for a specific wallet
 */
route.get("/api/wallet/:walletId", authenticateToken, getWalletHandler);

export default route;
