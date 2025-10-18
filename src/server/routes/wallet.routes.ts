import { Router } from "express";
import { 
  createWallet,
  getWallet,
  getUserWallets,
  createWalletWithAuthKey
} from "../controllers/wallet.controller.ts";

const route = Router();

/**
 * POST /api/wallet/create
 * Body: { userId: string, chainType?: "ethereum" | "solana" }
 * Creates a new wallet for a user
 */
route.post("/api/wallet/create", createWallet);

/**
 * GET /api/wallet/:walletId
 * Retrieves details for a specific wallet
 */
route.get("/api/wallet/:walletId", getWallet);

/**
 * GET /api/wallet/user/:userId
 * Gets all wallets for a specific user
 */
route.get("/api/wallet/user/:userId", getUserWallets);

/**
 * POST /api/wallet/create-with-auth-key
 * Body: { authKey: string, chainType?: "ethereum" | "solana" }
 * Creates a wallet controlled by an authorization key
 */
route.post("/api/wallet/create-with-auth-key", createWalletWithAuthKey);

export default route;
