import { Router } from "express";
import { postCreateWallet, getWalletInfo, login } from "../controllers/wallet.controller.ts";

const router = Router();

/**
 * POST /api/wallet/create
 * Creates a new wallet and stores the encrypted secret key
 * Returns: { success: boolean, walletAddress: string, message: string }
 */
router.post("/api/wallet/create", postCreateWallet);

/**
 * GET /api/wallet/:walletAddress
 * Gets information about a wallet (without exposing secret key)
 * Returns: { success: boolean, walletAddress: string, exists: boolean }
 */
router.get("/api/wallet/:walletAddress", getWalletInfo);

/**
 * POST /api/auth/login
 * Generates a JWT token for the user
 * Returns: { success: boolean, token: string, userId: string, email: string }
 */
router.post("/api/auth/login", login);

export default router;
