import { Router } from "express";
import { 
  createWalletHandler,
  getWalletHandler
} from "../controllers/wallet.controller.ts";

// can remove used for testing single phatom wallet
import { getSignerBalance } from "../controllers/wallet.controller.ts";

const route = Router();

/**
 * POST /api/wallet/create
 * BODY { chain?: "sol"|"eth"|"base"|"zora" }
 * Creates a new wallet using PRIVY_PUBLIC_AUTHORIZATION_KEY and returns address for frontend
 */
route.post("/api/wallet/create", createWalletHandler);

/**
 * GET /api/wallet/:walletId
 * Retrieves details for a specific wallet
 */
route.get("/api/wallet/:walletId", getWalletHandler);

// can remove used for testing single phatom wallet
route.get("/api/wallet/signer-balance", getSignerBalance);

export default route;
