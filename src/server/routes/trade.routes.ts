import { Router } from "express";
import { postBuy } from "../controllers/trade.controller.ts";
const route = Router();

/**
 * POST /api/trade/buy
 * Body: { mint: string, amountSol: number, walletAddress: string }
 * Swaps SOL -> <mint> using the specified wallet address
 */
route.post("/api/trade/buy", postBuy);

export default route;
